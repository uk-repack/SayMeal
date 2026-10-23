import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/targets";

export type ProfileRecord = {
  id: string;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  onboarded_at: string | null;
};

export type ProfileWrite = {
  id: string;
  sex: Sex | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  onboarded_at: string;
};

const ONBOARDED_KEY = "snapbite-onboarded-user";

export function isOnboarded(profile: ProfileRecord | null): boolean {
  return Boolean(profile?.onboarded_at);
}

export function markOnboardedLocally(userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ONBOARDED_KEY, userId);
}

export function readOnboardedLocally(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ONBOARDED_KEY) === userId;
}

export async function fetchOwnProfile(): Promise<{
  userId: string | null;
  profile: ProfileRecord | null;
  error: string | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      userId: null,
      profile: null,
      error: userError?.message ?? "No session yet.",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, sex, age, height_cm, weight_kg, activity_level, goal, calorie_target, protein_g, carbs_g, fat_g, onboarded_at",
    )
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    return { userId: userData.user.id, profile: null, error: error.message };
  }

  return {
    userId: userData.user.id,
    profile: data as ProfileRecord | null,
    error: null,
  };
}

export async function upsertOwnProfile(write: ProfileWrite): Promise<{
  error: string | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: userError?.message ?? "Sign-in is required to save." };
  }
  if (write.id !== userData.user.id) {
    return { error: "Profile id must match the signed-in user." };
  }

  const { error } = await supabase.from("profiles").upsert(write, {
    onConflict: "id",
  });

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}
