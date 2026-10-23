"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import type { Meal } from "@/lib/types";

type MealDetailSheetProps = {
  meal: Meal;
  busy: boolean;
  error: string | null;
  confirmDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function MealDetailSheet({
  meal,
  busy,
  error,
  confirmDelete,
  onClose,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: MealDetailSheetProps) {
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
      aria-labelledby="meal-detail-heading"
    >
      <div className="flex h-full w-full max-w-lg flex-col">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <p className="font-display text-lg font-medium text-foreground">
              SnapBite
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-forest">
              Eat Snap Track
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-muted hover:text-foreground"
            onClick={onClose}
            disabled={busy}
            aria-label="Close meal"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <h2
            id="meal-detail-heading"
            className="font-display mt-6 text-[2rem] leading-tight font-medium tracking-tight text-foreground"
          >
            {meal.title}
          </h2>
          <p className="mt-2 text-sm text-muted">{meal.loggedAtLabel}</p>

          <div className="mt-6 grid grid-cols-4 gap-2">
            <TotalTile label="Calories" value={meal.calories} unit="kcal" />
            <TotalTile label="Protein" value={meal.proteinG} unit="g" />
            <TotalTile label="Carbs" value={meal.carbsG} unit="g" />
            <TotalTile label="Fat" value={meal.fatG} unit="g" />
          </div>

          {meal.items.length > 0 ? (
            <ul className="mt-6 space-y-2">
              {meal.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {item.quantity} {item.unit || "g"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    {item.calories} kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {confirmDelete ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted">
                Delete this meal? This cannot be undone.
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-center rounded-full bg-red-700 py-3.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5c2b8]"
                onClick={onConfirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete meal"}
              </button>
              <button
                type="button"
                className="w-full py-2 text-sm text-muted"
                onClick={onCancelDelete}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-center rounded-full bg-[#245c45] py-3.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5c2b8]"
                onClick={onEdit}
                disabled={busy}
              >
                Edit
              </button>
              <button
                type="button"
                className="w-full py-2 text-sm text-red-700"
                onClick={onAskDelete}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
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
