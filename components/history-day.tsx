"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { DayDateSelector } from "@/components/day-date-selector";
import { MealComposer } from "@/components/meal-composer";
import { MealList } from "@/components/meal-list";
import { ProfileGate } from "@/components/profile-gate";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import { useLocalToday } from "@/lib/dates/use-local-today";
import { fetchOwnMealsForLocalDate } from "@/lib/meals/fetch";
import { shouldApplyDayFetch } from "@/lib/meals/log-date";
import { sumMeals } from "@/lib/nutrition/totals";
import type { Meal } from "@/lib/types";

export function HistoryDay() {
  return (
    <ProfileGate>
      <HistoryScreen />
    </ProfileGate>
  );
}

function HistoryScreen() {
  const auth = useAuthUser();
  const today = useLocalToday();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate = pickedDate ?? today;
  const [refreshToken, setRefreshToken] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const userId = auth.status === "ready" ? auth.userId : null;
  const loading = !selectedDate || loadedDate !== selectedDate;
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    if (!userId || !selectedDate) return;

    let cancelled = false;
    const requestedDate = selectedDate;
    selectedDateRef.current = requestedDate;
    void fetchOwnMealsForLocalDate(requestedDate).then((result) => {
      if (
        !shouldApplyDayFetch({
          cancelled,
          requestedDate,
          selectedDate: selectedDateRef.current ?? requestedDate,
        })
      ) {
        return;
      }
      setMeals(result.meals);
      setError(result.error);
      setLoadedDate(requestedDate);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, selectedDate, refreshToken]);

  const totals = useMemo(() => sumMeals(meals), [meals]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-2 pb-28">
        {today && selectedDate ? (
          <DayDateSelector
            selectedDate={selectedDate}
            today={today}
            onChange={setPickedDate}
          />
        ) : null}

        <section className="mt-6 grid grid-cols-4 gap-2" aria-label="Day totals">
          <TotalTile label="Calories" value={totals.calories} unit="kcal" />
          <TotalTile label="Protein" value={totals.proteinG} unit="g" />
          <TotalTile label="Carbs" value={totals.carbsG} unit="g" />
          <TotalTile label="Fat" value={totals.fatG} unit="g" />
        </section>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
            Could not load that day: {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-center text-sm text-muted" role="status">
            Loading meals…
          </p>
        ) : (
          <MealList
            key={selectedDate ?? "day"}
            loggedMeals={meals}
            heading="Logged meals"
            emptyTitle="Nothing logged this day."
            emptyDescription="No confirmed meals for this local calendar date. Log a meal below, or try another day."
            showSource
            localDate={selectedDate ?? undefined}
            onMealsMutated={() => setRefreshToken((n) => n + 1)}
          />
        )}
      </main>
      <MealComposer
        selectedDate={selectedDate ?? undefined}
        onMealSaved={() => setRefreshToken((n) => n + 1)}
      />
    </div>
  );
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
        {Math.round(value)}
      </p>
      <p className="text-[11px] text-muted">{unit}</p>
    </div>
  );
}
