"use client";

import { useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { MealComposer } from "@/components/meal-composer";
import { ProfileGate } from "@/components/profile-gate";
import { TodayDashboard } from "@/components/today-dashboard";

export function HomeShell() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <ProfileGate>
      <div className="flex min-h-full flex-1 flex-col bg-cream">
        <BrandHeader />

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-2 pb-28">
          <TodayDashboard refreshToken={refreshToken} />
        </main>

        <MealComposer onMealSaved={() => setRefreshToken((n) => n + 1)} />
      </div>
    </ProfileGate>
  );
}
