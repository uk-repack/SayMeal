import {
  JPEG_QUALITY,
  MAX_IMAGE_DIMENSION,
  MAX_PROCESSED_BYTES,
  MAX_UPLOAD_BYTES,
  validateImageFile,
} from "@/lib/meals/image";

export type CompressedMealImage = {
  blob: Blob;
  mimeType: "image/jpeg" | "image/webp";
  previewUrl: string;
  width: number;
  height: number;
};

function scaleSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }
  const scale = MAX_IMAGE_DIMENSION / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), type, quality);
  });
  if (!blob) {
    throw new Error("Could not compress that photo.");
  }
  return blob;
}

export async function compressMealImage(file: File): Promise<CompressedMealImage> {
  const invalid = validateImageFile(file);
  if (invalid.error) {
    throw new Error(invalid.error);
  }

  const bitmap = await createImageBitmap(file);
  const size = scaleSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare that photo.");
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  let blob = await encodeCanvas(canvas, "image/jpeg", JPEG_QUALITY);
  let mimeType: "image/jpeg" | "image/webp" = "image/jpeg";
  if (blob.size > MAX_PROCESSED_BYTES) {
    blob = await encodeCanvas(canvas, "image/jpeg", 0.7);
  }
  if (blob.size > MAX_PROCESSED_BYTES) {
    const webp = await encodeCanvas(canvas, "image/webp", 0.72);
    if (webp.size < blob.size) {
      blob = webp;
      mimeType = "image/webp";
    }
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Keep meal photos under 8 MB.");
  }

  return {
    blob,
    mimeType,
    previewUrl: URL.createObjectURL(blob),
    width: size.width,
    height: size.height,
  };
}
