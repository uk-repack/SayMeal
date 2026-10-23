"use client";

import { useEffect, useRef, useState } from "react";
import { DailySummary } from "@/components/daily-summary";
import { MealList } from "@/components/meal-list";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import { useLocalToday } from "@/lib/dates/use-local-today";
import { fetchOwnMealsForLocalDate } from "@/lib/meals/fetch";
import { shouldApplyDayFetch } from "@/lib/meals/log-date";
import { sumMeals } from "@/lib/nutrition/totals";
import { fetchOwnProfile } from "@/lib/profile/persist";
import type { Meal, NutritionTargets } from "@/lib/types";

function fallbackTargets(): NutritionTargets {
  return { calorieTarget: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

export function TodayDashboard({
  refreshToken = 0,
  localDate,
}: {
  refreshToken?: number;
  localDate?: string;
}) {
  const auth = useAuthUser();
  const today = useLocalToday();
  const selectedDate = localDate ?? today;
  const isToday = Boolean(today && selectedDate === today);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [mealTick, setMealTick] = useState(0);

  const userId = auth.status === "ready" ? auth.userId : null;
  const loading = !selectedDate || loadedDate !== selectedDate;
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    if (!userId || !selectedDate) return;

    let cancelled = false;
    const requestedDate = selectedDate;
    selectedDateRef.current = requestedDate;

    void Promise.all([
      fetchOwnProfile(),
      fetchOwnMealsForLocalDate(requestedDate),
    ]).then(([profileResult, mealsResult]) => {
      if (
        !shouldApplyDayFetch({
          cancelled,
          requestedDate,
          selectedDate: selectedDateRef.current ?? requestedDate,
        })
      ) {
        return;
      }

      const nextError = profileResult.error ?? mealsResult.error;
      const profile = profileResult.profile;
      setTargets(
        profile
          ? {
              calorieTarget: profile.calorie_target ?? 0,
              proteinG: profile.protein_g ?? 0,
              carbsG: profile.carbs_g ?? 0,
              fatG: profile.fat_g ?? 0,
            }
          : fallbackTargets(),
      );
      setMeals(mealsResult.meals);
      setError(nextError);
      setLoadedDate(requestedDate);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken, selectedDate, mealTick]);

  if (auth.status === "loading" || (auth.userId && loading)) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted" role="status">
        Loading {isToday ? "today's" : "that day's"} totals…
      </p>
    );
  }

  if (!auth.userId) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted" role="status">
        Starting a private session…
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          Could not load {isToday ? "today's" : "that day's"} data: {error}
        </p>
      ) : null}
      <DailySummary
        targets={targets ?? fallbackTargets()}
        consumed={sumMeals(meals)}
        isSample={false}
      />
      <MealList
        key={selectedDate ?? "day"}
        loggedMeals={meals}
        localDate={selectedDate ?? undefined}
        emptyTitle={isToday ? undefined : "Nothing logged this day."}
        emptyDescription={
          isToday
            ? undefined
            : "Describe your meal or add a photo below to log it on this date."
        }
        onMealsMutated={() => setMealTick((n) => n + 1)}
      />
    </>
  );
}
