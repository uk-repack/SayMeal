export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PROCESSED_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1280;
export const JPEG_QUALITY = 0.82;

export const NO_FOOD_PHOTO_ERROR =
  "No food was recognizable in that photo. Try another image.";

function sniffMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function normalizeDeclaredMime(value: string | null | undefined): string {
  const raw = (value ?? "").toLowerCase().trim();
  if (raw === "image/jpg") return "image/jpeg";
  return raw;
}

export function isAllowedImageMime(value: string | null | undefined): value is AllowedImageMime {
  const mime = normalizeDeclaredMime(value);
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime);
}

export function validateImageBytes(
  bytes: Uint8Array,
  declaredMime?: string | null,
): { mime: AllowedImageMime | null; error: string | null } {
  if (bytes.byteLength < 24) {
    return { mime: null, error: "That image file is too small or damaged." };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { mime: null, error: "Keep meal photos under 8 MB." };
  }

  const sniffed = sniffMime(bytes);
  if (!sniffed) {
    return {
      mime: null,
      error: "Use a JPEG, PNG, or WebP photo of the meal.",
    };
  }

  const declared = normalizeDeclaredMime(declaredMime);
  if (declared && isAllowedImageMime(declared) && declared !== sniffed) {
    return {
      mime: null,
      error: "That file type did not match the image data.",
    };
  }

  return { mime: sniffed, error: null };
}

export function validateImageFile(file: File | Blob | null): {
  error: string | null;
} {
  if (!file) {
    return { error: "Choose a meal photo first." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Keep meal photos under 8 MB." };
  }
  if ("type" in file && file.type && !isAllowedImageMime(file.type)) {
    return { error: "Use a JPEG, PNG, or WebP photo of the meal." };
  }
  return { error: null };
}
