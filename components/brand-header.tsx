"use client";

import { usePathname } from "next/navigation";
import { HeaderNav } from "@/components/header-nav";
import { TodayDate } from "@/components/today-date";

export function BrandHeader() {
  const pathname = usePathname();
  const dashboard = pathname === "/";
  const history = pathname === "/history";

  return (
    <header className="bg-transparent">
      <div className="mx-auto flex w-full max-w-lg items-start justify-between gap-4 px-5 pt-6 pb-2">
        {dashboard ? (
          <div>
            <h1 className="font-display text-[1.85rem] leading-tight font-medium tracking-tight text-foreground">
              SayMeal
            </h1>
            <h2 className="text-sm text-muted">say it, track it</h2>
            <TodayDate />
          </div>
        ) : history ? (
          <div>
            <h1 className="font-display text-[1.85rem] leading-tight font-medium tracking-tight text-foreground">
              History
            </h1>
            <p className="mt-1 text-sm text-muted">Past meals by day</p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-forest">
              Eat Snap Track
            </p>
            <h1 className="font-display mt-1 text-2xl font-medium tracking-tight text-foreground">
              SayMeal
            </h1>
          </div>
        )}
        <div className="flex flex-col items-end gap-1 pt-1">
          {dashboard || history ? null : <TodayDate />}
          <HeaderNav />
        </div>
      </div>
    </header>
  );
}
