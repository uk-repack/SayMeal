"use client";

import { useEffect, useState } from "react";
import { DailySummary } from "@/components/daily-summary";
import { MealList } from "@/components/meal-list";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import { localDateString } from "@/lib/dates/local-date";
import { fetchOwnMealsForLocalDate } from "@/lib/meals/fetch";
import { sumMeals } from "@/lib/nutrition/totals";
import { fetchOwnProfile } from "@/lib/profile/persist";
import type { Meal, NutritionTargets } from "@/lib/types";

function fallbackTargets(): NutritionTargets {
  return { calorieTarget: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

export function TodayDashboard({ refreshToken = 0 }: { refreshToken?: number }) {
  const auth = useAuthUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = auth.status === "ready" ? auth.userId : null;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const localDate = localDateString();

    void Promise.all([fetchOwnProfile(), fetchOwnMealsForLocalDate(localDate)]).then(
      ([profileResult, mealsResult]) => {
        if (cancelled) return;

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
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  if (auth.status === "loading" || (auth.userId && loading)) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted" role="status">
        Loading today&apos;s totals…
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
          Could not load today&apos;s data: {error}
        </p>
      ) : null}
      <DailySummary
        targets={targets ?? fallbackTargets()}
        consumed={sumMeals(meals)}
        isSample={false}
      />
      <MealList loggedMeals={meals} />
    </>
  );
}
