export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_TEXT_MODEL = GEMINI_MODEL;

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key ? key : null;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}
