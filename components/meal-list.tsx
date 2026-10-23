"use client";

import { useRef, useState } from "react";
import { ForkIcon } from "@/components/icons";
import { MealConfirmSheet } from "@/components/meal-confirm-sheet";
import { MealDetailSheet } from "@/components/meal-detail-sheet";
import {
  deleteOwnConfirmedMeal,
  estimatedMealFromLogged,
  updateOwnConfirmedMeal,
} from "@/lib/meals/persist";
import type { EstimatedMeal } from "@/lib/meals/estimate";
import type { Meal } from "@/lib/types";

type MealListProps = {
  loggedMeals: Meal[];
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showSource?: boolean;
  localDate?: string;
  onMealsMutated?: () => void;
};

export function MealList({
  loggedMeals,
  heading = "Your meals",
  emptyTitle = "Your first bite starts here.",
  emptyDescription = "Describe your meal or add a photo below. We'll take care of the nutrition estimate.",
  showSource = false,
  localDate,
  onMealsMutated,
}: MealListProps) {
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);

  const editorMeal = openMeal ? estimatedMealFromLogged(openMeal) : null;

  function closeAll() {
    if (busy) return;
    setOpenMeal(null);
    setEditing(false);
    setConfirmDelete(false);
    setActionError(null);
  }

  async function onSaveEdit(meal: EstimatedMeal) {
    if (!openMeal || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError(null);
    const result = await updateOwnConfirmedMeal({
      mealId: openMeal.id,
      meal,
    });
    setBusy(false);
    lock.current = false;
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setEditing(false);
    setOpenMeal(null);
    setConfirmDelete(false);
    onMealsMutated?.();
  }

  async function onDelete() {
    if (!openMeal || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError(null);
    const result = await deleteOwnConfirmedMeal(openMeal.id);
    setBusy(false);
    lock.current = false;
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setOpenMeal(null);
    setEditing(false);
    setConfirmDelete(false);
    onMealsMutated?.();
  }

  return (
    <section aria-labelledby="meals-heading" className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="meals-heading"
          className="font-display text-[1.65rem] font-medium tracking-tight text-foreground"
        >
          {heading}
        </h2>
        <p className="pb-1 text-sm text-muted">
          {loggedMeals.length === 0
            ? "No meals yet"
            : `${loggedMeals.length} meal${loggedMeals.length === 1 ? "" : "s"} logged`}
        </p>
      </div>

      {loggedMeals.length === 0 ? (
        <div className="px-2 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7eee8] text-forest">
            <ForkIcon className="h-7 w-7" />
          </div>
          <p className="font-display mt-5 text-xl font-medium text-foreground">
            {emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[#e6e3db]">
          {loggedMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              showSource={showSource}
              onOpen={() => {
                setOpenMeal(meal);
                setEditing(false);
                setConfirmDelete(false);
                setActionError(null);
              }}
            />
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted">
        AI estimates. Always yours to adjust.
      </p>

      {openMeal && !editing ? (
        <MealDetailSheet
          meal={openMeal}
          busy={busy}
          error={actionError}
          confirmDelete={confirmDelete}
          onClose={closeAll}
          onEdit={() => {
            if (busy) return;
            if (!editorMeal?.meal) {
              setActionError(
                editorMeal?.error ?? "This meal cannot be edited.",
              );
              return;
            }
            setConfirmDelete(false);
            setActionError(null);
            setEditing(true);
          }}
          onAskDelete={() => {
            if (busy) return;
            setActionError(null);
            setConfirmDelete(true);
          }}
          onCancelDelete={() => {
            if (busy) return;
            setConfirmDelete(false);
          }}
          onConfirmDelete={() => {
            void onDelete();
          }}
        />
      ) : null}

      {openMeal && editing && editorMeal?.meal ? (
        <MealConfirmSheet
          key={openMeal.id}
          meal={editorMeal.meal}
          saving={busy}
          error={actionError}
          source="text"
          mode="edit"
          localDate={localDate}
          excludeMealId={openMeal.id}
          onCancel={closeAll}
          onBack={() => {
            if (busy) return;
            setEditing(false);
            setActionError(null);
          }}
          onConfirm={onSaveEdit}
        />
      ) : null}
    </section>
  );
}

function sourceLabel(source: Meal["source"]): string {
  if (source === "photo") return "From photo";
  if (source === "both") return "Text and photo";
  return "From text";
}

function MealCard({
  meal,
  showSource,
  onOpen,
}: {
  meal: Meal;
  showSource: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 py-4 text-left"
        onClick={onOpen}
        aria-label={`Open ${meal.title}`}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e7eee8] text-forest"
          aria-hidden="true"
        >
          <ForkIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{meal.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {meal.loggedAtLabel}
            <span aria-hidden="true"> · </span>
            {showSource ? sourceLabel(meal.source) : "AI estimate"}
          </p>
          <p className="mt-1 text-sm tabular-nums text-muted">
            P {meal.proteinG}g
            <span aria-hidden="true"> · </span>
            C {meal.carbsG}g
            <span aria-hidden="true"> · </span>
            F {meal.fatG}g
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {meal.calories}
          </p>
          <p className="text-xs text-muted">kcal</p>
        </div>
      </button>
    </li>
  );
}
