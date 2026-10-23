"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { localDateString } from "@/lib/dates/local-date";
import {
  type EstimatedMeal,
  type EstimatedMealItem,
  withRecalculatedTotals,
} from "@/lib/meals/estimate";
import { fetchOwnMealsForLocalDate } from "@/lib/meals/fetch";
import { validateEditedEstimate } from "@/lib/meals/persist";
import { remainingCalories, sumMeals } from "@/lib/nutrition/totals";
import { fetchOwnProfile } from "@/lib/profile/persist";
import type { NutritionTargets, NutritionTotals } from "@/lib/types";

const inputClass =
  "w-full rounded-2xl border border-[#e2dfd6] bg-white px-3 py-3 text-base text-foreground placeholder:text-muted focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20";

type MealConfirmSheetProps = {
  meal: EstimatedMeal;
  saving: boolean;
  error: string | null;
  photoPreviewUrl?: string | null;
  source?: "text" | "photo";
  localDate?: string;
  mode?: "create" | "edit";
  excludeMealId?: string;
  onCancel: () => void;
  onBack?: () => void;
  onConfirm: (meal: EstimatedMeal) => void;
};

function toField(value: number): string {
  return String(value);
}

function parseField(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function MealConfirmSheet({
  meal,
  saving,
  error,
  photoPreviewUrl,
  source = "text",
  localDate,
  mode = "create",
  excludeMealId,
  onCancel,
  onBack,
  onConfirm,
}: MealConfirmSheetProps) {
  const [title, setTitle] = useState(meal.title);
  const [items, setItems] = useState<EstimatedMealItem[]>(meal.items);
  const [editingItems, setEditingItems] = useState(false);
  const [prior, setPrior] = useState<NutritionTotals>({
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });
  const [targets, setTargets] = useState<NutritionTargets | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchOwnProfile(),
      fetchOwnMealsForLocalDate(localDate ?? localDateString()),
    ]).then(([profileResult, mealsResult]) => {
      if (cancelled) return;
      const profile = profileResult.profile;
      setTargets(
        profile
          ? {
              calorieTarget: profile.calorie_target ?? 0,
              proteinG: profile.protein_g ?? 0,
              carbsG: profile.carbs_g ?? 0,
              fatG: profile.fat_g ?? 0,
            }
          : null,
      );
      setPrior(
        sumMeals(
          mealsResult.meals.filter((row) => row.id !== excludeMealId),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [localDate, excludeMealId]);

  const preview = useMemo(
    () =>
      withRecalculatedTotals({
        title,
        assumptions: meal.assumptions,
        items,
        totals: meal.totals,
      }),
    [title, items, meal.assumptions, meal.totals],
  );

  function updateItem(index: number, patch: Partial<EstimatedMealItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const validated = validateEditedEstimate(preview);
    if (!validated.meal) return;
    onConfirm(validated.meal);
  }

  const validation = validateEditedEstimate(preview);
  const portionG = items.reduce((sum, item) => sum + item.quantity, 0);
  const afterCalories = prior.calories + preview.totals.calories;
  const left = targets
    ? remainingCalories(afterCalories, targets.calorieTarget)
    : null;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const sheet = (
    <div
      className="fixed inset-0 z-[70] flex justify-center bg-[#f3f0e8]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-meal-heading"
    >
      <form
        className="flex h-full w-full max-w-lg flex-col"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <p className="font-display text-lg font-medium text-foreground">SayMeal</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-forest">
              Eat Snap Track
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-muted hover:text-foreground"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close review"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <h2
            id="confirm-meal-heading"
            className="font-display mt-6 text-[2rem] leading-tight font-medium tracking-tight text-foreground"
          >
            {mode === "edit" ? "Edit meal." : "A closer look."}
          </h2>
          <p className="mt-2 text-sm text-forest">
            {mode === "edit"
              ? "Saved meal · Not a new estimate"
              : "AI estimate · Not logged yet"}
          </p>

          {photoPreviewUrl ? (
            <div className="mt-5 overflow-hidden rounded-[1.6rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt="Meal photo used for this estimate"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}

          <label className="mt-5 block text-sm text-muted" htmlFor="meal-title">
            Meal name
          </label>
          <input
            id="meal-title"
            className={`${inputClass} mt-1`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {items.length} item{items.length === 1 ? "" : "s"} · approx. {portionG} g
            </p>
            <button
              type="button"
              className="text-sm font-medium text-forest"
              onClick={() => setEditingItems((open) => !open)}
            >
              {editingItems ? "Hide items" : "Edit portion"}
            </button>
          </div>

          {editingItems ? (
            <ul className="mt-4 space-y-3">
              {items.map((item, index) => (
                <li
                  key={`meal-item-${index}`}
                  className="rounded-2xl border border-[#e2dfd6] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="sr-only" htmlFor={`item-name-${index}`}>
                      Food name
                    </label>
                    <input
                      id={`item-name-${index}`}
                      className={inputClass}
                      value={item.name}
                      onChange={(event) =>
                        updateItem(index, { name: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-full px-2 py-2 text-sm text-muted hover:text-red-700"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <NumberField
                      id={`portion-${index}`}
                      label="Portion"
                      unit="g"
                      value={toField(item.quantity)}
                      onChange={(value) =>
                        updateItem(index, { quantity: parseField(value) })
                      }
                    />
                    <NumberField
                      id={`kcal-${index}`}
                      label="Calories"
                      unit="kcal"
                      value={toField(item.calories)}
                      onChange={(value) =>
                        updateItem(index, { calories: parseField(value) })
                      }
                    />
                    <NumberField
                      id={`protein-${index}`}
                      label="Protein"
                      unit="g"
                      value={toField(item.proteinG)}
                      onChange={(value) =>
                        updateItem(index, { proteinG: parseField(value) })
                      }
                    />
                    <NumberField
                      id={`carbs-${index}`}
                      label="Carbs"
                      unit="g"
                      value={toField(item.carbsG)}
                      onChange={(value) =>
                        updateItem(index, { carbsG: parseField(value) })
                      }
                    />
                    <NumberField
                      id={`fat-${index}`}
                      label="Fat"
                      unit="g"
                      value={toField(item.fatG)}
                      onChange={(value) =>
                        updateItem(index, { fatG: parseField(value) })
                      }
                    />
                  </div>
                  {item.notes ? (
                    <p className="mt-2 text-xs leading-5 text-muted">{item.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex items-end justify-between">
            <p className="text-base font-medium text-foreground">Estimated nutrition</p>
            <p className="text-sm text-muted">Tap Edit portion to adjust</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <TotalTile label="Calories" value={preview.totals.calories} unit="kcal" />
            <TotalTile label="Protein" value={preview.totals.proteinG} unit="g" />
            <TotalTile label="Carbs" value={preview.totals.carbsG} unit="g" />
            <TotalTile label="Fat" value={preview.totals.fatG} unit="g" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            {meal.assumptions ||
              (source === "photo"
                ? "Photos can miss oils and portion sizes. Adjust anything that looks off."
                : "These numbers are estimates, not lab measurements.")}
          </p>

          {targets ? (
            <div className="mt-5 flex items-center justify-between rounded-[1.4rem] bg-[#e7eee8] px-4 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-forest">
                  After this meal
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {Math.round(afterCalories).toLocaleString()} /{" "}
                  {targets.calorieTarget.toLocaleString()} kcal
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-forest">
                  {left?.toLocaleString()}
                </p>
                <p className="text-xs text-muted">kcal left</p>
              </div>
            </div>
          ) : null}

          {validation.error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {validation.error}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#245c45] py-3.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5c2b8] disabled:text-white"
            disabled={saving || Boolean(validation.error)}
          >
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Confirm & log meal"}
            {saving ? null : <CheckIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="mt-3 w-full py-2 text-sm text-muted"
            onClick={onBack ?? onCancel}
            disabled={saving}
          >
            {source === "photo" ? "Back to photo" : "Back"}
          </button>
        </div>
      </form>
    </div>
  );

  if (!mounted) return null;
  return createPortal(sheet, document.body);
}

function TotalTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-2 py-3 text-center shadow-sm shadow-stone-900/5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted">{unit}</p>
    </div>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
        <span className="ml-1 font-normal">{unit}</span>
      </label>
      <input
        id={id}
        inputMode="decimal"
        className={`${inputClass} mt-1`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
