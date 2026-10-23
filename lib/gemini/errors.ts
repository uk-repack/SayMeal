import { ApiError } from "@google/genai";

export function publicGeminiError(
  error: unknown,
  fallback = "Could not estimate that meal. Try again.",
): { status: number; error: string } {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return { status: 504, error: "The estimate timed out. Try again." };
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        status: 429,
        error: "Too many estimate requests. Wait a moment and try again.",
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        status: 503,
        error: "Meal estimates are not available right now.",
      };
    }
    if (error.status >= 500) {
      return {
        status: 502,
        error: "The estimate service had a problem. Try again.",
      };
    }
    return { status: 502, error: fallback };
  }
  if (error instanceof SyntaxError) {
    return {
      status: 502,
      error: "The estimate came back in an unexpected format.",
    };
  }
  return { status: 502, error: fallback };
}
