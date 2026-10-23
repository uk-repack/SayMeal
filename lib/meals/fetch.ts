import { formatLoggedAtLabel } from "@/lib/dates/local-date";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Meal, MealItem, MealSource } from "@/lib/types";

export type MealRow = {
  id: string;
  user_id: string;
  title: string | null;
  logged_at: string;
  local_date: string;
  source: MealSource;
  raw_text: string | null;
  items: unknown;
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  status: "draft" | "confirmed";
};

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapItems(items: unknown): MealItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? `Item ${index + 1}`);
    return [
      {
        name,
        quantity: toNumber(row.quantity as number | string | undefined),
        unit: String(row.unit ?? ""),
        calories: toNumber(
          (row.calories ?? row.kcal) as number | string | undefined,
        ),
        proteinG: toNumber(
          (row.proteinG ?? row.protein_g) as number | string | undefined,
        ),
        carbsG: toNumber(
          (row.carbsG ?? row.carbs_g) as number | string | undefined,
        ),
        fatG: toNumber((row.fatG ?? row.fat_g) as number | string | undefined),
        notes:
          typeof row.notes === "string" ? row.notes.trim().slice(0, 240) : "",
      },
    ];
  });
}

export function mapMealRow(row: MealRow): Meal {
  return {
    id: row.id,
    title: row.title?.trim() || row.raw_text?.trim() || "Meal",
    loggedAtLabel: formatLoggedAtLabel(row.logged_at),
    source: row.source,
    calories: Math.round(toNumber(row.calories)),
    proteinG: Math.round(toNumber(row.protein_g)),
    carbsG: Math.round(toNumber(row.carbs_g)),
    fatG: Math.round(toNumber(row.fat_g)),
    items: mapItems(row.items),
  };
}

async function queryOwnConfirmedMeals(localDate: string): Promise<{
  rows: MealRow[];
  error: string | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { rows: [], error: userError?.message ?? "No session yet." };
  }

  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, user_id, title, logged_at, local_date, source, raw_text, items, calories, protein_g, carbs_g, fat_g, status",
    )
    .eq("user_id", userData.user.id)
    .eq("local_date", localDate)
    .eq("status", "confirmed")
    .order("logged_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []) as MealRow[], error: null };
}

export async function fetchOwnMealsForLocalDate(localDate: string): Promise<{
  meals: Meal[];
  error: string | null;
}> {
  const { rows, error } = await queryOwnConfirmedMeals(localDate);
  if (error) return { meals: [], error };
  return { meals: rows.map(mapMealRow), error: null };
}

export async function fetchOwnConfirmedMealRowsForLocalDate(
  localDate: string,
): Promise<{
  rows: MealRow[];
  error: string | null;
}> {
  return queryOwnConfirmedMeals(localDate);
}
