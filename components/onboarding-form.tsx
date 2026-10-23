"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  draftFromProfile,
  emptyOnboardingDraft,
  preserveOnboardedAt,
  targetFieldsFromProfile,
  validateOnboardingDraft,
  validateTargetOverrides,
  type OnboardingDraft,
} from "@/lib/nutrition/onboarding";
import {
  ACTIVITY_DETAILS,
  ACTIVITY_MULTIPLIERS,
  calculateTargets,
  macrosFromCalories,
  type ActivityLevel,
  type Goal,
  type NutritionEstimate,
} from "@/lib/nutrition/targets";
import {
  isOnboarded,
  markOnboardedLocally,
  upsertOwnProfile,
  type ProfileRecord,
  type ProfileWrite,
} from "@/lib/profile/persist";

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20";

const choiceClass =
  "flex cursor-pointer flex-col rounded-xl border border-stone-200 bg-white px-3 py-3 text-left has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50/60";

type OnboardingFormProps = {
  userId: string;
  initialProfile?: ProfileRecord | null;
  onSaved?: () => void;
  saveProfile?: (write: ProfileWrite) => Promise<{ error: string | null }>;
};

function estimateFromSavedTargets(
  profile: ProfileRecord,
): NutritionEstimate {
  return {
    calorieTarget: profile.calorie_target ?? 0,
    proteinG: Math.round(Number(profile.protein_g ?? 0)),
    carbsG: Math.round(Number(profile.carbs_g ?? 0)),
    fatG: Math.round(Number(profile.fat_g ?? 0)),
    bmr: 0,
    tdee: 0,
    sexSkipped: profile.sex == null,
    calorieRange: null,
    notes: ["These numbers are general estimates, not medical advice."],
  };
}

export function OnboardingForm({
  userId,
  initialProfile = null,
  onSaved,
  saveProfile = upsertOwnProfile,
}: OnboardingFormProps) {
  const editing = isOnboarded(initialProfile);
  const savedTargets = targetFieldsFromProfile(initialProfile);
  const [step, setStep] = useState<"details" | "review">(
    editing ? "review" : "details",
  );
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    editing ? draftFromProfile(initialProfile) : emptyOnboardingDraft(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(() =>
    editing && initialProfile ? estimateFromSavedTargets(initialProfile) : null,
  );
  const [calories, setCalories] = useState(savedTargets.calorieTarget);
  const [proteinG, setProteinG] = useState(savedTargets.proteinG);
  const [carbsG, setCarbsG] = useState(savedTargets.carbsG);
  const [fatG, setFatG] = useState(savedTargets.fatG);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedDetails = useMemo(() => validateOnboardingDraft(draft), [draft]);

  function setField<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function goToReview(event: FormEvent) {
    event.preventDefault();
    const { values, errors } = validateOnboardingDraft(draft);
    setFieldErrors(errors);
    if (!values) return;
    const next = calculateTargets(values);
    setEstimate(next);
    setCalories(String(next.calorieTarget));
    setProteinG(String(next.proteinG));
    setCarbsG(String(next.carbsG));
    setFatG(String(next.fatG));
    setSaveError(null);
    setStep("review");
  }

  function onCaloriesChange(value: string) {
    setCalories(value);
    const n = Number(value);
    if (!parsedDetails.values || !Number.isFinite(n)) return;
    const macros = macrosFromCalories(n, parsedDetails.values.weightKg, parsedDetails.values.goal);
    setProteinG(String(macros.proteinG));
    setCarbsG(String(macros.carbsG));
    setFatG(String(macros.fatG));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const details = validateOnboardingDraft(draft);
    const targets = validateTargetOverrides({
      calorieTarget: calories,
      proteinG,
      carbsG,
      fatG,
    });
    setFieldErrors({ ...details.errors, ...targets.errors });
    if (!details.values || !targets.values) return;

    setSaving(true);
    setSaveError(null);
    const result = await saveProfile({
      id: userId,
      sex: details.values.sex,
      age: details.values.age,
      height_cm: details.values.heightCm,
      weight_kg: details.values.weightKg,
      activity_level: details.values.activityLevel,
      goal: details.values.goal,
      calorie_target: targets.values.calorieTarget,
      protein_g: targets.values.proteinG,
      carbs_g: targets.values.carbsG,
      fat_g: targets.values.fatG,
      onboarded_at: preserveOnboardedAt(initialProfile?.onboarded_at),
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    markOnboardedLocally(userId);
    onSaved?.();
  }

  if (step === "review" && estimate) {
    return (
      <form className="space-y-5" onSubmit={onSave} noValidate>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
            Step 2 of 2
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">
            {editing ? "Edit your targets" : "Review your estimate"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Adjust anything before saving. SnapBite will use these as today&apos;s
            targets. Existing meals are left unchanged.
          </p>
        </div>

        {estimate.sexSkipped && estimate.calorieRange ? (
          <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950">
            {estimate.notes[0]}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="calorieTarget"
            label="Calories"
            value={calories}
            onChange={onCaloriesChange}
            error={fieldErrors.calorieTarget}
            unit="kcal"
          />
          <NumberField
            id="proteinG"
            label="Protein"
            value={proteinG}
            onChange={setProteinG}
            error={fieldErrors.proteinG}
            unit="g"
          />
          <NumberField
            id="carbsG"
            label="Carbs"
            value={carbsG}
            onChange={setCarbsG}
            error={fieldErrors.carbsG}
            unit="g"
          />
          <NumberField
            id="fatG"
            label="Fat"
            value={fatG}
            onChange={setFatG}
            error={fieldErrors.fatG}
            unit="g"
          />
        </div>

        <p className="text-sm leading-6 text-stone-500">
          {estimate.notes[estimate.notes.length - 1]}
        </p>

        {saveError ? (
          <p className="text-sm text-red-700" role="alert">
            Could not save: {saveError}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800"
            onClick={() => setStep("details")}
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white disabled:bg-[#c5c2b8]"
          >
            {saving ? "Saving…" : "Save targets"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-6" onSubmit={goToReview} noValidate>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
          Step 1 of 2
        </p>
        <h2 className="mt-1 text-xl font-semibold text-stone-900">
          {editing ? "Update your details" : "Set your targets"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Short questions, then an editable calorie estimate. Nothing is medical
          advice.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800">Primary goal</legend>
        <div className="mt-2 grid gap-2">
          {(
            [
              ["lose", "Lose fat", "About 15% below estimated maintenance."],
              ["maintain", "Maintain weight", "Stay near estimated maintenance."],
              ["gain", "Build muscle", "About 10% above estimated maintenance."],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className={choiceClass}>
              <input
                className="sr-only"
                type="radio"
                name="goal"
                value={value}
                checked={draft.goal === value}
                aria-label={label}
                onChange={() => setField("goal", value as Goal)}
              />
              <span className="text-sm font-medium text-stone-900">{label}</span>
              <span className="mt-1 text-sm text-stone-500">{hint}</span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.goal} />
      </fieldset>

      <div className="grid gap-4">
        <LabeledInput
          id="age"
          label="Age"
          unit="years"
          inputMode="numeric"
          value={draft.age}
          onChange={(value) => setField("age", value)}
          error={fieldErrors.age}
        />
        <LabeledInput
          id="heightCm"
          label="Height"
          unit="cm"
          inputMode="decimal"
          value={draft.heightCm}
          onChange={(value) => setField("heightCm", value)}
          error={fieldErrors.heightCm}
        />
        <LabeledInput
          id="weightKg"
          label="Current weight"
          unit="kg"
          inputMode="decimal"
          value={draft.weightKg}
          onChange={(value) => setField("weightKg", value)}
          error={fieldErrors.weightKg}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800">Activity level</legend>
        <div className="mt-2 grid gap-2">
          {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((level) => (
            <label key={level} className={choiceClass}>
              <input
                className="sr-only"
                type="radio"
                name="activityLevel"
                value={level}
                checked={draft.activityLevel === level}
                aria-label={ACTIVITY_DETAILS[level].label}
                onChange={() => setField("activityLevel", level)}
              />
              <span className="text-sm font-medium text-stone-900">
                {ACTIVITY_DETAILS[level].label}
              </span>
              <span className="mt-1 text-sm text-stone-500">
                {ACTIVITY_DETAILS[level].description} ×{ACTIVITY_MULTIPLIERS[level]}
              </span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.activityLevel} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800">
          Sex for the calorie formula
        </legend>
        <p className="mt-1 text-sm text-stone-500">
          Mifflin–St Jeor uses sex. Skip it if you prefer; we&apos;ll show a midpoint
          estimate and let you edit the result.
        </p>
        <div className="mt-2 grid gap-2">
          {(
            [
              ["female", "Female"],
              ["male", "Male"],
              ["skip", "Prefer not to say"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={choiceClass}>
              <input
                className="sr-only"
                type="radio"
                name="sex"
                value={value}
                checked={draft.sex === value}
                aria-label={label}
                onChange={() => setField("sex", value)}
              />
              <span className="text-sm font-medium text-stone-900">{label}</span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.sex} />
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white"
      >
        Calculate estimate
      </button>
    </form>
  );
}

function LabeledInput({
  id,
  label,
  unit,
  value,
  onChange,
  error,
  inputMode,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputMode?: "numeric" | "decimal";
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label} <span className="font-normal text-stone-400">({unit})</span>
      </label>
      <input
        id={id}
        className={`${inputClass} mt-1`}
        value={value}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  unit,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  unit: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <input
        id={id}
        className={`${inputClass} mt-1`}
        inputMode="numeric"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="mt-1 text-xs text-stone-400">{unit}</p>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
