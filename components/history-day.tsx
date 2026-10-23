"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { MealList } from "@/components/meal-list";
import { ProfileGate } from "@/components/profile-gate";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import {
  clampLocalDateToToday,
  formatLocalDateHeading,
  localDateString,
  shiftLocalDate,
} from "@/lib/dates/local-date";
import { fetchOwnMealsForLocalDate } from "@/lib/meals/fetch";
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
  const today = localDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const userId = auth.status === "ready" ? auth.userId : null;
  const atToday = selectedDate >= today;
  const loading = loadedDate !== selectedDate;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void fetchOwnMealsForLocalDate(selectedDate).then((result) => {
      if (cancelled) return;
      setMeals(result.meals);
      setError(result.error);
      setLoadedDate(selectedDate);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, selectedDate]);

  const totals = useMemo(() => sumMeals(meals), [meals]);

  function goDays(delta: number) {
    const next = clampLocalDateToToday(shiftLocalDate(selectedDate, delta), today);
    setSelectedDate(next);
  }

  function onPickDate(value: string) {
    setSelectedDate(clampLocalDateToToday(value, today));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-2 pb-10">
        <div className="mt-4 flex items-center justify-between gap-2 rounded-[1.4rem] bg-white px-2 py-2 shadow-sm shadow-stone-900/5">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-forest hover:bg-[#e7eee8] disabled:text-[#c5c2b8]"
            onClick={() => goDays(-1)}
            aria-label="Previous day"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <label className="min-w-0 flex-1 text-center">
            <span className="sr-only">Choose a date</span>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => onPickDate(event.target.value)}
              className="w-full bg-transparent text-center text-sm font-medium text-foreground outline-none"
            />
            <p className="mt-0.5 text-xs text-muted">
              {selectedDate === today ? "Today" : formatLocalDateHeading(selectedDate)}
            </p>
          </label>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-forest hover:bg-[#e7eee8] disabled:text-[#c5c2b8]"
            onClick={() => goDays(1)}
            disabled={atToday}
            aria-label="Next day"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

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
            loggedMeals={meals}
            heading="Logged meals"
            emptyTitle="Nothing logged this day."
            emptyDescription="No confirmed meals for this local calendar date. Try another day, or log a meal from Today."
            showSource
          />
        )}
      </main>
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
