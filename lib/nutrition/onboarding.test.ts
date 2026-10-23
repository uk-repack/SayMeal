import { describe, expect, it } from "vitest";
import {
  draftFromProfile,
  emptyOnboardingDraft,
  preserveOnboardedAt,
  validateOnboardingDraft,
  validateTargetOverrides,
} from "@/lib/nutrition/onboarding";
import type { ProfileRecord } from "@/lib/profile/persist";

const validDraft = {
  goal: "lose" as const,
  age: "30",
  heightCm: "180",
  weightKg: "80",
  activityLevel: "moderate" as const,
  sex: "male" as const,
};

describe("validateOnboardingDraft", () => {
  it("accepts a complete valid draft", () => {
    const { values, errors } = validateOnboardingDraft(validDraft);
    expect(errors).toEqual({});
    expect(values).toEqual({
      goal: "lose",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      sex: "male",
    });
  });

  it("maps skipped sex to null instead of inventing a value", () => {
    const { values } = validateOnboardingDraft({ ...validDraft, sex: "skip" });
    expect(values?.sex).toBeNull();
  });

  it("requires fields and rejects out-of-range values", () => {
    expect(validateOnboardingDraft(emptyOnboardingDraft()).errors).toMatchObject({
      goal: expect.any(String),
      age: expect.any(String),
      heightCm: expect.any(String),
      weightKg: expect.any(String),
      activityLevel: expect.any(String),
      sex: expect.any(String),
    });
    expect(validateOnboardingDraft({ ...validDraft, age: "12" }).errors.age).toBeTruthy();
    expect(validateOnboardingDraft({ ...validDraft, heightCm: "90" }).errors.heightCm).toBeTruthy();
    expect(validateOnboardingDraft({ ...validDraft, weightKg: "500" }).errors.weightKg).toBeTruthy();
  });
});

describe("draftFromProfile", () => {
  it("maps a saved profile into the form, including skipped sex", () => {
    const profile: ProfileRecord = {
      id: "user-a",
      sex: null,
      age: 30,
      height_cm: 180,
      weight_kg: 80,
      activity_level: "moderate",
      goal: "lose",
      calorie_target: 2345,
      protein_g: 128,
      carbs_g: 312,
      fat_g: 65,
      onboarded_at: "2026-10-22T00:00:00.000Z",
    };
    expect(draftFromProfile(profile)).toEqual({
      goal: "lose",
      age: "30",
      heightCm: "180",
      weightKg: "80",
      activityLevel: "moderate",
      sex: "skip",
    });
    expect(preserveOnboardedAt(profile.onboarded_at)).toBe(profile.onboarded_at);
  });
});

describe("validateTargetOverrides", () => {
  it("accepts the fixture targets", () => {
    const { values, errors } = validateTargetOverrides({
      calorieTarget: "2345",
      proteinG: "128",
      carbsG: "312",
      fatG: "65",
    });
    expect(errors).toEqual({});
    expect(values).toEqual({
      calorieTarget: 2345,
      proteinG: 128,
      carbsG: 312,
      fatG: 65,
    });
  });

  it("rejects negative macros and calories outside the clamp", () => {
    expect(
      validateTargetOverrides({
        calorieTarget: "800",
        proteinG: "-1",
        carbsG: "10",
        fatG: "10",
      }).errors,
    ).toMatchObject({
      calorieTarget: expect.any(String),
      proteinG: expect.any(String),
    });
  });
});
