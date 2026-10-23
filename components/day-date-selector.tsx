"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  clampLocalDateToToday,
  formatLocalDateHeading,
  shiftLocalDate,
} from "@/lib/dates/local-date";

type DayDateSelectorProps = {
  selectedDate: string;
  today: string;
  onChange: (next: string) => void;
};

export function DayDateSelector({
  selectedDate,
  today,
  onChange,
}: DayDateSelectorProps) {
  const atToday = selectedDate >= today;

  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-[1.4rem] bg-white px-2 py-2 shadow-sm shadow-stone-900/5">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-forest hover:bg-[#e7eee8] disabled:text-[#c5c2b8]"
        onClick={() =>
          onChange(clampLocalDateToToday(shiftLocalDate(selectedDate, -1), today))
        }
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
          onChange={(event) =>
            onChange(clampLocalDateToToday(event.target.value, today))
          }
          className="w-full bg-transparent text-center text-sm font-medium text-foreground outline-none"
        />
        <p className="mt-0.5 text-xs text-muted">
          {selectedDate === today ? "Today" : formatLocalDateHeading(selectedDate)}
        </p>
      </label>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-forest hover:bg-[#e7eee8] disabled:text-[#c5c2b8]"
        onClick={() =>
          onChange(clampLocalDateToToday(shiftLocalDate(selectedDate, 1), today))
        }
        disabled={atToday}
        aria-label="Next day"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
