import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_MAX,
  CALORIE_MIN,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@/lib/nutrition/targets";
import type { ProfileRecord } from "@/lib/profile/persist";

export const AGE_MIN = 13;
export const AGE_MAX = 100;
export const HEIGHT_CM_MIN = 100;
export const HEIGHT_CM_MAX = 250;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 400;

export type OnboardingDraft = {
  goal: Goal | "";
  age: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | "";
  sex: Sex | "skip" | "";
};

export type OnboardingValues = {
  goal: Goal;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  sex: Sex | null;
};

export type FieldErrors = Partial<Record<keyof OnboardingDraft, string>>;

export const emptyOnboardingDraft = (): OnboardingDraft => ({
  goal: "",
  age: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  sex: "",
});

export function draftFromProfile(profile: ProfileRecord | null): OnboardingDraft {
  if (!profile) return emptyOnboardingDraft();
  return {
    goal: profile.goal ?? "",
    age: profile.age == null ? "" : String(profile.age),
    heightCm: profile.height_cm == null ? "" : String(profile.height_cm),
    weightKg: profile.weight_kg == null ? "" : String(profile.weight_kg),
    activityLevel: profile.activity_level ?? "",
    sex: profile.sex ?? (profile.onboarded_at ? "skip" : ""),
  };
}

export function targetFieldsFromProfile(profile: ProfileRecord | null): {
  calorieTarget: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
} {
  return {
    calorieTarget:
      profile?.calorie_target == null ? "" : String(profile.calorie_target),
    proteinG: profile?.protein_g == null ? "" : String(Math.round(Number(profile.protein_g))),
    carbsG: profile?.carbs_g == null ? "" : String(Math.round(Number(profile.carbs_g))),
    fatG: profile?.fat_g == null ? "" : String(Math.round(Number(profile.fat_g))),
  };
}

export function preserveOnboardedAt(existing: string | null | undefined): string {
  return existing || new Date().toISOString();
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateOnboardingDraft(draft: OnboardingDraft): {
  values: OnboardingValues | null;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  if (draft.goal !== "lose" && draft.goal !== "maintain" && draft.goal !== "gain") {
    errors.goal = "Choose a goal.";
  }

  const age = parseNumber(draft.age);
  if (age === null || !Number.isInteger(age)) {
    errors.age = "Enter your age in whole years.";
  } else if (age < AGE_MIN || age > AGE_MAX) {
    errors.age = `Age must be between ${AGE_MIN} and ${AGE_MAX}.`;
  }

  const heightCm = parseNumber(draft.heightCm);
  if (heightCm === null) {
    errors.heightCm = "Enter your height in centimetres.";
  } else if (heightCm < HEIGHT_CM_MIN || heightCm > HEIGHT_CM_MAX) {
    errors.heightCm = `Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`;
  }

  const weightKg = parseNumber(draft.weightKg);
  if (weightKg === null) {
    errors.weightKg = "Enter your weight in kilograms.";
  } else if (weightKg < WEIGHT_KG_MIN || weightKg > WEIGHT_KG_MAX) {
    errors.weightKg = `Weight must be between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg.`;
  }

  if (!(draft.activityLevel in ACTIVITY_MULTIPLIERS)) {
    errors.activityLevel = "Choose how active you are.";
  }

  if (draft.sex !== "female" && draft.sex !== "male" && draft.sex !== "skip") {
    errors.sex = "Choose an option, or skip the sex question.";
  }

  if (Object.keys(errors).length > 0) {
    return { values: null, errors };
  }

  return {
    errors: {},
    values: {
      goal: draft.goal as Goal,
      age: age as number,
      heightCm: heightCm as number,
      weightKg: weightKg as number,
      activityLevel: draft.activityLevel as ActivityLevel,
      sex: draft.sex === "skip" ? null : (draft.sex as Sex),
    },
  };
}

export function validateTargetOverrides(input: {
  calorieTarget: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}): { errors: Record<string, string>; values: { calorieTarget: number; proteinG: number; carbsG: number; fatG: number } | null } {
  const errors: Record<string, string> = {};
  const calorieTarget = parseNumber(input.calorieTarget);
  const proteinG = parseNumber(input.proteinG);
  const carbsG = parseNumber(input.carbsG);
  const fatG = parseNumber(input.fatG);

  if (calorieTarget === null || calorieTarget < CALORIE_MIN || calorieTarget > CALORIE_MAX) {
    errors.calorieTarget = `Calories must be between ${CALORIE_MIN} and ${CALORIE_MAX}.`;
  }
  if (proteinG === null || proteinG < 0 || !Number.isInteger(proteinG)) {
    errors.proteinG = "Protein must be a whole number of grams, 0 or more.";
  }
  if (carbsG === null || carbsG < 0 || !Number.isInteger(carbsG)) {
    errors.carbsG = "Carbs must be a whole number of grams, 0 or more.";
  }
  if (fatG === null || fatG < 0 || !Number.isInteger(fatG)) {
    errors.fatG = "Fat must be a whole number of grams, 0 or more.";
  }

  if (Object.keys(errors).length > 0 || calorieTarget === null || proteinG === null || carbsG === null || fatG === null) {
    return { errors, values: null };
  }

  return {
    errors: {},
    values: {
      calorieTarget: Math.round(calorieTarget),
      proteinG,
      carbsG,
      fatG,
    },
  };
}
