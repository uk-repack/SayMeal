import { describe, expect, it } from "vitest";
import {
  CALORIE_MAX,
  CALORIE_MIN,
  calculateTargets,
  macrosFromCalories,
  mifflinStJeorBmr,
} from "@/lib/nutrition/targets";

const fixture = {
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderate" as const,
  goal: "lose" as const,
  sex: "male" as const,
};

describe("mifflinStJeorBmr", () => {
  it("matches the documented male and female equations", () => {
    expect(mifflinStJeorBmr(80, 180, 30, "male")).toBe(1780);
    expect(mifflinStJeorBmr(80, 180, 30, "female")).toBe(1614);
  });
});

describe("calculateTargets", () => {
  it("uses the Phase 3 fixture: 30y male, 180cm, 80kg, moderate, lose", () => {
    const result = calculateTargets(fixture);
    expect(result.calorieTarget).toBe(2345);
    expect(result.proteinG).toBe(128);
    expect(result.carbsG).toBe(312);
    expect(result.fatG).toBe(65);
    expect(result.sexSkipped).toBe(false);
    expect(result.calorieRange).toBeNull();
  });

  it("drops calories ~15% for fat loss and raises ~10% for muscle gain", () => {
    const maintain = calculateTargets({ ...fixture, goal: "maintain" });
    const lose = calculateTargets({ ...fixture, goal: "lose" });
    const gain = calculateTargets({ ...fixture, goal: "gain" });
    expect(maintain.tdee).toBe(2759);
    expect(lose.calorieTarget).toBe(Math.round(maintain.tdee * 0.85));
    expect(gain.calorieTarget).toBe(Math.round(maintain.tdee * 1.1));
  });

  it("uses 1.6 g/kg protein for lose/gain and 1.2 g/kg for maintain", () => {
    expect(calculateTargets({ ...fixture, goal: "lose" }).proteinG).toBe(128);
    expect(calculateTargets({ ...fixture, goal: "gain" }).proteinG).toBe(128);
    expect(calculateTargets({ ...fixture, goal: "maintain" }).proteinG).toBe(96);
  });

  it("sets fat to ~25% of calories and fills remaining calories with carbs", () => {
    const result = calculateTargets(fixture);
    expect(result.fatG * 9).toBeCloseTo(result.calorieTarget * 0.25, -1);
    const macroCalories =
      result.proteinG * 4 + result.carbsG * 4 + result.fatG * 9;
    expect(Math.abs(macroCalories - result.calorieTarget)).toBeLessThanOrEqual(9);
  });

  it("does not silently assume a sex when it is skipped", () => {
    const skipped = calculateTargets({ ...fixture, sex: null });
    const female = calculateTargets({ ...fixture, sex: "female" });
    const male = calculateTargets({ ...fixture, sex: "male" });
    expect(skipped.sexSkipped).toBe(true);
    expect(skipped.calorieTarget).not.toBe(female.calorieTarget);
    expect(skipped.calorieTarget).not.toBe(male.calorieTarget);
    expect(skipped.calorieRange).toEqual({
      min: female.calorieTarget,
      max: male.calorieTarget,
    });
    expect(skipped.notes[0]).toMatch(/not silently/i);
  });

  it("clamps calories to the documented band", () => {
    const low = macrosFromCalories(800, 80, "lose");
    const high = macrosFromCalories(9000, 80, "lose");
    expect(low.calorieTarget).toBe(CALORIE_MIN);
    expect(high.calorieTarget).toBe(CALORIE_MAX);
  });

  it("never returns negative macros", () => {
    const result = macrosFromCalories(1200, 400, "gain");
    expect(result.proteinG).toBeGreaterThanOrEqual(0);
    expect(result.carbsG).toBeGreaterThanOrEqual(0);
    expect(result.fatG).toBeGreaterThanOrEqual(0);
  });

  it("rejects invalid numeric inputs", () => {
    expect(() =>
      calculateTargets({ ...fixture, weightKg: 0 }),
    ).toThrow(/greater than zero/);
    expect(() =>
      calculateTargets({ ...fixture, age: Number.NaN }),
    ).toThrow(/finite/);
  });
});
