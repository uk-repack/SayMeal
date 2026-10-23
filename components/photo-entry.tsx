"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { ChevronDownIcon, CloseIcon } from "@/components/icons";
import { MealConfirmSheet } from "@/components/meal-confirm-sheet";
import { localDateString } from "@/lib/dates/local-date";
import { compressMealImage } from "@/lib/images/compress-image";
import type { EstimatedMeal } from "@/lib/meals/estimate";
import { validateImageFile } from "@/lib/meals/image";
import { insertOwnConfirmedMeal } from "@/lib/meals/persist";

type PhotoEntryProps = {
  onMealSaved?: () => void;
  onCollapse?: () => void;
  onUseText?: () => void;
};

export function PhotoEntry({
  onMealSaved,
  onCollapse,
  onUseText,
}: PhotoEntryProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState<EstimatedMeal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function revokePreview(url: string | null) {
    if (url) URL.revokeObjectURL(url);
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearPhoto() {
    revokePreview(previewUrl);
    setFileName(null);
    setPreviewUrl(null);
    setImageBlob(null);
    setNotice(null);
    setError(null);
    setEstimate(null);
    setSaveError(null);
    resetInput();
  }

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    revokePreview(previewUrl);
    setPreviewUrl(null);
    setImageBlob(null);
    setEstimate(null);
    setSaveError(null);

    if (!file) {
      setFileName(null);
      setNotice(null);
      setError(null);
      return;
    }

    const invalid = validateImageFile(file);
    if (invalid.error) {
      setFileName(null);
      setError(invalid.error);
      setNotice(null);
      resetInput();
      return;
    }

    setProcessing(true);
    setError(null);
    setNotice("Preparing photo…");
    try {
      const compressed = await compressMealImage(file);
      setFileName(file.name);
      setPreviewUrl(compressed.previewUrl);
      setImageBlob(compressed.blob);
      setNotice(null);
    } catch (caught) {
      setFileName(null);
      setPreviewUrl(null);
      setImageBlob(null);
      setNotice(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not prepare that photo. Try another image.",
      );
      resetInput();
    } finally {
      setProcessing(false);
    }
  }

  async function onEstimate() {
    if (!imageBlob || processing || estimating || saving) return;
    setEstimating(true);
    setError(null);
    setNotice("Estimating nutrition from photo…");
    try {
      const body = new FormData();
      body.append("image", imageBlob, fileName ?? "meal.jpg");
      const response = await fetch("/api/meals/estimate-photo", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        estimate?: EstimatedMeal;
        error?: string;
      };
      if (!response.ok || !payload.estimate) {
        setEstimate(null);
        setError(payload.error ?? "Could not estimate that photo.");
        setNotice(null);
        return;
      }
      setEstimate(payload.estimate);
      setNotice(null);
    } catch {
      setEstimate(null);
      setError("Could not reach the estimate service. Try again.");
      setNotice(null);
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
      rawText: "",
      localDate: localDateString(),
      source: "photo",
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    setEstimate(null);
    clearPhoto();
    onMealSaved?.();
    onCollapse?.();
  }

  const busy = processing || estimating || saving;

  return (
    <>
      {estimate ? null : (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 sm:items-center"
      onClick={onCollapse}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[1.75rem] border border-white bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_12px_40px_rgba(28,28,25,0.16)] sm:rounded-[1.75rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.7rem] font-medium tracking-tight text-foreground">
              Add a meal photo
            </h2>
            <p className="mt-1 text-sm text-muted">
              One photo. An estimate you can make your own.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-muted"
            onClick={onCollapse}
            aria-label="Close photo entry"
          >
            <ChevronDownIcon className="h-6 w-6" />
          </button>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={onChange}
        />

        {previewUrl ? (
          <div className="relative mt-5 overflow-hidden rounded-[1.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={fileName ? `Selected photo ${fileName}` : "Selected meal photo"}
              className="h-56 w-full object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              disabled={busy}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground"
              aria-label="Remove photo"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-5 flex h-56 w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#d7d3c8] bg-white text-sm text-muted"
          >
            Tap to take or choose a photo
          </button>
        )}

        <div className="mt-4 flex items-center justify-between text-sm font-medium text-forest">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Change photo
          </button>
          <button type="button" onClick={onUseText} disabled={busy}>
            Use text instead
          </button>
        </div>

        <button
          type="button"
          onClick={onEstimate}
          disabled={busy || !imageBlob}
          className="mt-5 w-full rounded-full bg-[#245c45] py-3.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5c2b8] disabled:text-white"
        >
          {estimating ? "Estimating…" : "Estimate photo"}
        </button>
        <p className="mt-3 text-center text-sm text-muted">
          Review portions and nutrition before logging.
        </p>
        {notice ? (
          <p className="mt-3 text-center text-sm text-muted" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-center text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      </div>
      )}

      {estimate ? (
        <MealConfirmSheet
          meal={estimate}
          saving={saving}
          error={saveError}
          photoPreviewUrl={previewUrl}
          source="photo"
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
    </>
  );
}
