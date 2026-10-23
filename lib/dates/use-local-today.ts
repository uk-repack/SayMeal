"use client";

import { useSyncExternalStore } from "react";
import { localDateString } from "@/lib/dates/local-date";

function subscribeNever() {
  return () => {};
}

/** Device-local YYYY-MM-DD after mount. Null during prerender (no `new Date()` on the server). */
export function useLocalToday(): string | null {
  return useSyncExternalStore(subscribeNever, localDateString, () => null);
}
