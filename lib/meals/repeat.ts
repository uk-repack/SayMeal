import {
  formatLocalDateHeading,
  formatLoggedAtLabel,
  mostRecentPastWeekday,
  shiftLocalDate,
} from "@/lib/dates/local-date";
import type { EstimatedMeal, EstimatedMealItem } from "@/lib/meals/estimate";
import {
  parseModelEstimate,
  withRecalculatedTotals,
} from "@/lib/meals/estimate";
import type { MealRow } from "@/lib/meals/fetch";
import { mealWriteFromEstimate } from "@/lib/meals/persist";
import type { MealSource } from "@/lib/types";

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type RepeatCommand = {
  date: string;
  slot: MealSlot | null;
  query: string | null;
};

export type RepeatParseResult =
  | { status: "repeat"; command: RepeatCommand }
  | { status: "unsupported"; message: string }
  | { status: "none" };

export type RepeatMealCandidate = {
  id: string;
  title: string;
  rawText: string | null;
  source: MealSource;
  localDate: string;
  loggedAt: string;
  loggedAtLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: EstimatedMealItem[];
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const SLOT_WORDS: MealSlot[] = ["breakfast", "lunch", "dinner"];

const STOPWORDS = new Set([
  "a",
  "add",
  "again",
  "also",
  "an",
  "ate",
  "back",
  "breakfast",
  "copy",
  "d",
  "dinner",
  "eat",
  "for",
  "from",
  "had",
  "have",
  "i",
  "it",
  "just",
  "last",
  "log",
  "logged",
  "lunch",
  "me",
  "meal",
  "meals",
  "more",
  "my",
  "night",
  "of",
  "on",
  "once",
  "one",
  "past",
  "please",
  "previous",
  "repeat",
  "same",
  "that",
  "the",
  "thing",
  "this",
  "to",
  "today",
  "yesterday",
  "you",
]);

const MISSING_DAY_MESSAGE =
  "Say which day to copy from, like yesterday or Monday.";

function normalizeCommand(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\byesterday's\b/g, "yesterday")
    .replace(/\blast night\b/g, "yesterday")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuestionLike(text: string, normalized: string): boolean {
  if (text.includes("?")) return true;
  if (
    /^(how|what|why|when|which|who|did i|do i|does|can you|could you)\b/.test(
      normalized,
    )
  ) {
    return true;
  }
  const asksNutrition = /\b(how many|calories|calorie|macros?|remaining)\b/.test(
    normalized,
  );
  const hasRepeatWords = /\b(repeat|again|the same|copy)\b/.test(normalized);
  return asksNutrition && !hasRepeatWords;
}

function hasCopyIntent(normalized: string): boolean {
  return (
    /\b(repeat|copy)\b/.test(normalized) ||
    /\bagain\b/.test(normalized) ||
    /\bthe same\b/.test(normalized) ||
    /\bsame (breakfast|lunch|dinner|meal|one|thing)\b/.test(normalized)
  );
}

function extractSlots(normalized: string): MealSlot[] {
  return SLOT_WORDS.filter((slot) =>
    new RegExp(`\\b${slot}\\b`).test(normalized),
  );
}

function extractDate(
  normalized: string,
  today: string,
): { date: string; rest: string } | null {
  if (/\byesterday\b/.test(normalized)) {
    return {
      date: shiftLocalDate(today, -1),
      rest: normalized.replace(/\byesterday\b/g, " ").replace(/\s+/g, " ").trim(),
    };
  }
  if (/\btoday\b/.test(normalized)) {
    return {
      date: today,
      rest: normalized.replace(/\btoday\b/g, " ").replace(/\s+/g, " ").trim(),
    };
  }
  const week = normalized.match(
    /\b(?:on |last )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (!week) return null;
  const weekday = WEEKDAYS[week[1]];
  const date = mostRecentPastWeekday(today, weekday);
  if (!date) return null;
  return {
    date,
    rest: normalized
      .replace(
        /\b(?:on |last )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function leftoverQuery(rest: string): string | null {
  const tokens = rest
    .split(" ")
    .map((token) => token.replace(/'/g, ""))
    .filter((token) => token && !STOPWORDS.has(token) && !WEEKDAYS[token]);
  if (tokens.length === 0) return null;
  return tokens.join(" ");
}

export function parseRepeatMealCommand(
  text: string,
  today: string,
): RepeatParseResult {
  const normalized = normalizeCommand(text);
  if (!normalized) return { status: "none" };
  if (isQuestionLike(text, normalized)) return { status: "none" };

  const copyIntent = hasCopyIntent(normalized);
  const hasLog = /\b(log|add)\b/.test(normalized);
  const slots = extractSlots(normalized);
  if (slots.length > 1) {
    return copyIntent
      ? {
          status: "unsupported",
          message: "Say breakfast, lunch, or dinner — not more than one.",
        }
      : { status: "none" };
  }
  const slot = slots[0] ?? null;
  const dated = extractDate(normalized, today);
  const query = leftoverQuery(dated?.rest ?? normalized);

  if (copyIntent && !dated) {
    return { status: "unsupported", message: MISSING_DAY_MESSAGE };
  }

  if (copyIntent && dated) {
    return {
      status: "repeat",
      command: { date: dated.date, slot, query },
    };
  }

  if (hasLog && slot && dated && !query) {
    return {
      status: "repeat",
      command: { date: dated.date, slot, query: null },
    };
  }

  return { status: "none" };
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapSavedItems(items: unknown): EstimatedMealItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? `Item ${index + 1}`).trim() || `Item ${index + 1}`;
    return [
      {
        name: name.slice(0, 80),
        quantity: Math.round(toNumber(row.quantity ?? row.portion_g)),
        unit:
          typeof row.unit === "string" && row.unit.trim()
            ? row.unit.trim().slice(0, 16)
            : "g",
        calories: Math.round(toNumber(row.calories ?? row.kcal)),
        proteinG: Math.round(toNumber(row.proteinG ?? row.protein_g)),
        carbsG: Math.round(toNumber(row.carbsG ?? row.carbs_g)),
        fatG: Math.round(toNumber(row.fatG ?? row.fat_g)),
        notes: typeof row.notes === "string" ? row.notes.trim().slice(0, 240) : "",
      },
    ];
  });
}

export function candidateFromMealRow(row: MealRow): RepeatMealCandidate {
  return {
    id: row.id,
    title: row.title?.trim() || row.raw_text?.trim() || "Meal",
    rawText: row.raw_text,
    source: row.source,
    localDate: row.local_date,
    loggedAt: row.logged_at,
    loggedAtLabel: formatLoggedAtLabel(row.logged_at),
    calories: Math.round(toNumber(row.calories)),
    proteinG: Math.round(toNumber(row.protein_g)),
    carbsG: Math.round(toNumber(row.carbs_g)),
    fatG: Math.round(toNumber(row.fat_g)),
    items: mapSavedItems(row.items),
  };
}

function searchableText(meal: RepeatMealCandidate): string {
  return [meal.title, meal.rawText ?? "", ...meal.items.map((item) => item.name)]
    .join(" ")
    .toLowerCase();
}

function localHour(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
}

function mealMatchesSlot(meal: RepeatMealCandidate, slot: MealSlot): boolean {
  if (searchableText(meal).includes(slot)) return true;
  const hour = localHour(meal.loggedAt);
  if (hour == null) return false;
  if (slot === "breakfast") return hour >= 4 && hour < 11;
  if (slot === "lunch") return hour >= 11 && hour < 16;
  return hour >= 16 && hour < 23;
}

function mealMatchesQuery(meal: RepeatMealCandidate, query: string): boolean {
  const haystack = searchableText(meal);
  return query.split(" ").every((token) => haystack.includes(token));
}

export function matchRepeatMeals(
  command: RepeatCommand,
  meals: RepeatMealCandidate[],
): RepeatMealCandidate[] {
  return meals
    .filter((meal) => meal.localDate === command.date)
    .filter((meal) => (command.slot ? mealMatchesSlot(meal, command.slot) : true))
    .filter((meal) =>
      command.query ? mealMatchesQuery(meal, command.query) : true,
    )
    .slice()
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function estimatedMealFromSaved(
  meal: RepeatMealCandidate,
): { meal: EstimatedMeal | null; error: string | null } {
  const payload = {
    title: meal.title,
    assumptions: `Copied from your ${formatLocalDateHeading(meal.localDate)} meal. These are saved values, not a new estimate.`,
    items: meal.items.map((item) => ({
      name: item.name,
      portion_g: item.quantity,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      notes: item.notes,
    })),
  };
  const parsed = parseModelEstimate(payload, meal.title);
  if (!parsed.meal) return parsed;
  return { meal: withRecalculatedTotals(parsed.meal), error: null };
}

export function copiedMealWriteFields(meal: RepeatMealCandidate): {
  title: string;
  raw_text: string | null;
  source: MealSource;
  items: ReturnType<typeof mealWriteFromEstimate>["items"];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  status: "confirmed";
} | null {
  const copied = estimatedMealFromSaved(meal);
  if (!copied.meal) return null;
  return mealWriteFromEstimate(
    copied.meal,
    meal.rawText ?? "",
    meal.source,
  );
}
