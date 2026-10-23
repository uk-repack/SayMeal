"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpIcon,
  CameraIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@/components/icons";
import { MealConfirmSheet } from "@/components/meal-confirm-sheet";
import { PhotoEntry } from "@/components/photo-entry";
import { localDateString } from "@/lib/dates/local-date";
import {
  MEAL_TEXT_MAX,
  type EstimatedMeal,
  validateMealText,
} from "@/lib/meals/estimate";
import { insertOwnConfirmedMeal } from "@/lib/meals/persist";

type MealComposerProps = {
  onMealSaved?: () => void;
};

type ComposerMode = "collapsed" | "text" | "photo";

export function MealComposer({ onMealSaved }: MealComposerProps) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<ComposerMode>("collapsed");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState<EstimatedMeal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "text") {
      textareaRef.current?.focus();
    }
  }, [mode]);

  function collapse() {
    if (estimating || saving) return;
    setMode("collapsed");
    setStatus(null);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (estimating || saving) return;

    const { text: cleaned, error: textError } = validateMealText(text);
    if (!cleaned) {
      setError(textError);
      setStatus(null);
      return;
    }

    setEstimating(true);
    setError(null);
    setStatus("Estimating nutrition…");

    try {
      const response = await fetch("/api/meals/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      });
      const payload = (await response.json()) as {
        estimate?: EstimatedMeal;
        error?: string;
      };
      if (!response.ok || !payload.estimate) {
        setEstimate(null);
        setError(payload.error ?? "Could not estimate that meal.");
        setStatus(null);
        return;
      }
      setEstimate(payload.estimate);
      setStatus(null);
    } catch {
      setEstimate(null);
      setError("Could not reach the estimate service. Try again.");
      setStatus(null);
    } finally {
      setEstimating(false);
    }
  }

  async function onConfirm(meal: EstimatedMeal) {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await insertOwnConfirmedMeal({
      meal,
      rawText: text.trim(),
      localDate: localDateString(),
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    setEstimate(null);
    setText("");
    setError(null);
    setStatus(null);
    setMode("collapsed");
    onMealSaved?.();
  }

  return (
    <section aria-labelledby="composer-heading">
      <h2 id="composer-heading" className="sr-only">
        What did you eat?
      </h2>

      {mode === "collapsed" ? (
        <div className="flex h-14 items-center rounded-full bg-white shadow-[0_10px_30px_rgba(28,28,25,0.08)]">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 px-5 text-left text-[15px] text-muted"
            onClick={() => setMode("text")}
          >
            <PlusIcon className="h-5 w-5 shrink-0 text-foreground" />
            <span>What did you eat?</span>
          </button>
          <div className="h-6 w-px bg-[#e6e3db]" aria-hidden="true" />
          <button
            type="button"
            className="px-4 text-foreground"
            onClick={() => setMode("photo")}
            aria-label="Add a meal photo"
          >
            <CameraIcon className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {mode === "text" ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-stone-900/25 sm:items-center"
          onClick={collapse}
        >
          <div
            className="w-full max-w-lg rounded-t-[1.75rem] border border-white bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_12px_40px_rgba(28,28,25,0.16)] sm:rounded-[1.75rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[1.7rem] font-medium tracking-tight text-foreground">
                  What did you eat?
                </p>
                <p className="mt-1 text-sm text-muted">
                  Type, or dictate with Wispr Flow.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-muted"
                onClick={collapse}
                aria-label="Collapse meal entry"
              >
                <ChevronDownIcon className="h-6 w-6" />
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <label htmlFor={fieldId} className="sr-only">
                What did you eat?
              </label>
              <textarea
                ref={textareaRef}
                id={fieldId}
                name="meal"
                rows={4}
                maxLength={MEAL_TEXT_MAX}
                value={text}
                disabled={estimating || saving}
                onChange={(event) => {
                  setText(event.target.value);
                  if (status) setStatus(null);
                  if (error) setError(null);
                }}
                placeholder="Grilled salmon, a cup of brown rice, broccoli and a little lemon dressing."
                autoComplete="off"
                className="w-full resize-none rounded-[1.25rem] border border-[#e2dfd6] bg-white px-4 py-3 text-base leading-7 text-foreground placeholder:text-muted focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:opacity-70"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  disabled={estimating || saving}
                  className="flex items-center gap-2 rounded-full border border-[#d7d3c8] bg-white px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  <CameraIcon className="h-5 w-5" />
                  Photo
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || estimating || saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-forest py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5c2b8]"
                >
                  {estimating ? "Estimating…" : "Log meal"}
                  {estimating ? null : <ArrowUpIcon className="h-4 w-4" />}
                </button>
              </div>
            </form>
            <p className="mt-3 text-sm text-muted">
              AI-estimated nutrition · Edit any meal after logging.
            </p>
            {status ? (
              <p className="mt-2 text-sm text-muted" role="status">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === "photo" ? (
        <PhotoEntry
          onMealSaved={onMealSaved}
          onCollapse={collapse}
          onUseText={() => setMode("text")}
        />
      ) : null}

      {estimate ? (
        <MealConfirmSheet
          meal={estimate}
          saving={saving}
          error={saveError}
          source="text"
          onCancel={() => {
            if (saving) return;
            setEstimate(null);
            setSaveError(null);
          }}
          onBack={() => {
            if (saving) return;
            setEstimate(null);
            setSaveError(null);
          }}
          onConfirm={onConfirm}
        />
      ) : null}
    </section>
  );
}
