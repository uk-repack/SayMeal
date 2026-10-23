"use client";

import { useSyncExternalStore } from "react";

function formatLocalToday(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return formatLocalToday(new Date());
}

function getServerSnapshot() {
  return "Today";
}

export function TodayDate() {
  const label = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return <p className="mt-1 text-sm text-muted">{label}</p>;
}
