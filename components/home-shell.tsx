"use client";

import { useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { DayDateSelector } from "@/components/day-date-selector";
import { MealComposer } from "@/components/meal-composer";
import { ProfileGate } from "@/components/profile-gate";
import { TodayDashboard } from "@/components/today-dashboard";
import { useLocalToday } from "@/lib/dates/use-local-today";

export function HomeShell() {
  const today = useLocalToday();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const selectedDate = pickedDate ?? today;

  return (
    <ProfileGate>
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
          <TodayDashboard
            localDate={selectedDate ?? undefined}
            refreshToken={refreshToken}
          />
        </main>

        <MealComposer
          selectedDate={selectedDate ?? undefined}
          onMealSaved={() => setRefreshToken((n) => n + 1)}
        />
      </div>
    </ProfileGate>
  );
}
