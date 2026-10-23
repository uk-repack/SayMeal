import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstimatedMeal, EstimatedMealItem } from "@/lib/meals/estimate";
import { parseModelEstimate, withRecalculatedTotals } from "@/lib/meals/estimate";
import { persistableLocalDate } from "@/lib/meals/log-date";
import type { Meal, MealSource } from "@/lib/types";

export function mealWriteFromEstimate(
  meal: EstimatedMeal,
  rawText: string,
  source: MealSource = "text",
): {
  title: string;
  raw_text: string | null;
  source: MealSource;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    notes: string;
  }>;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  status: "confirmed";
} {
  const normalized = withRecalculatedTotals(meal);
  return {
    title: normalized.title,
    raw_text: rawText.trim() ? rawText.trim() : null,
    source,
    items: normalized.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      notes: item.notes,
    })),
    calories: normalized.totals.calories,
    protein_g: normalized.totals.proteinG,
    carbs_g: normalized.totals.carbsG,
    fat_g: normalized.totals.fatG,
    status: "confirmed",
  };
}

export function validateEditedEstimate(meal: EstimatedMeal): {
  meal: EstimatedMeal | null;
  error: string | null;
} {
  const payload = {
    title: meal.title,
    assumptions: meal.assumptions,
    items: meal.items.map((item: EstimatedMealItem) => ({
      name: item.name,
      portion_g: item.quantity,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      notes: item.notes,
    })),
  };
  return parseModelEstimate(payload, meal.title);
}

export async function insertOwnConfirmedMeal(input: {
  meal: EstimatedMeal;
  rawText: string;
  localDate: string;
  source?: MealSource;
}): Promise<{ error: string | null }> {
  const validated = validateEditedEstimate(input.meal);
  if (!validated.meal) {
    return { error: validated.error ?? "Fix the meal details before saving." };
  }

  const localDate = persistableLocalDate(input.localDate);
  if (!localDate) {
    return { error: "Pick a valid day to log this meal." };
  }

  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: userError?.message ?? "Sign-in is required to save." };
  }

  const write = mealWriteFromEstimate(
    validated.meal,
    input.rawText,
    input.source ?? "text",
  );
  const { error } = await supabase.from("meals").insert({
    user_id: userData.user.id,
    title: write.title,
    raw_text: write.raw_text,
    local_date: localDate,
    source: write.source,
    items: write.items,
    calories: write.calories,
    protein_g: write.protein_g,
    carbs_g: write.carbs_g,
    fat_g: write.fat_g,
    status: write.status,
  });

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export function estimatedMealFromLogged(
  meal: Meal,
): { meal: EstimatedMeal | null; error: string | null } {
  const payload = {
    title: meal.title,
    assumptions: "",
    items: meal.items.map((item) => ({
      name: item.name,
      portion_g: item.quantity,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      notes: item.notes ?? "",
    })),
  };
  const parsed = parseModelEstimate(payload, meal.title);
  if (!parsed.meal) return parsed;
  return { meal: withRecalculatedTotals(parsed.meal), error: null };
}

function requireMealId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed ? trimmed : null;
}

export async function updateOwnConfirmedMeal(input: {
  mealId: string;
  meal: EstimatedMeal;
}): Promise<{ error: string | null }> {
  const mealId = requireMealId(input.mealId);
  if (!mealId) {
    return { error: "That meal could not be updated." };
  }

  const validated = validateEditedEstimate(input.meal);
  if (!validated.meal) {
    return { error: validated.error ?? "Fix the meal details before saving." };
  }

  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: userError?.message ?? "Sign-in is required to save." };
  }

  const write = mealWriteFromEstimate(validated.meal, "");
  const { data, error } = await supabase
    .from("meals")
    .update({
      title: write.title,
      items: write.items,
      calories: write.calories,
      protein_g: write.protein_g,
      carbs_g: write.carbs_g,
      fat_g: write.fat_g,
    })
    .eq("id", mealId)
    .eq("user_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data?.id) {
    return { error: "Could not update that meal." };
  }
  return { error: null };
}

export async function deleteOwnConfirmedMeal(
  mealId: string,
): Promise<{ error: string | null }> {
  const id = requireMealId(mealId);
  if (!id) {
    return { error: "That meal could not be deleted." };
  }

  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: userError?.message ?? "Sign-in is required to delete." };
  }

  const { data, error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data?.id) {
    return { error: "Could not delete that meal." };
  }
  return { error: null };
}
