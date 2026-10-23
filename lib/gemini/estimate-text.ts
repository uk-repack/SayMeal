import { GoogleGenAI } from "@google/genai";
import { publicGeminiError } from "@/lib/gemini/errors";
import { GEMINI_MODEL, getGeminiApiKey } from "@/lib/gemini/env";
import {
  MEAL_ESTIMATE_JSON_SCHEMA,
  parseModelEstimate,
  parseModelJsonText,
  type EstimatedMeal,
} from "@/lib/meals/estimate";

const REQUEST_TIMEOUT_MS = 25_000;

const SYSTEM_INSTRUCTION = `You estimate nutrition for a meal described in everyday language.
Return only structured JSON matching the schema.
Identify foods in one pass. Do not invent extra dishes that were not mentioned.
Use grams for portions when practical.
Calories and macros must be non-negative estimates for the stated portion.
Put uncertainty (oil, brand, restaurant vs homemade, default sizes) in assumptions and item notes.
These are estimates, not lab values or medical advice.`;

export type EstimateTextResult =
  | { ok: true; meal: EstimatedMeal }
  | { ok: false; status: number; error: string };

export async function estimateMealFromText(
  text: string,
): Promise<EstimateTextResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error:
        "Meal estimates are not configured. Add GEMINI_API_KEY on the server.",
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const abort = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Meal description:\n${text}`,
      config: {
        abortSignal: abort,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: MEAL_ESTIMATE_JSON_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText?.trim()) {
      return {
        ok: false,
        status: 502,
        error: "The estimate came back empty. Try again.",
      };
    }

    const parsed = parseModelEstimate(parseModelJsonText(rawText), text);
    if (!parsed.meal) {
      return {
        ok: false,
        status: 502,
        error: parsed.error ?? "The estimate could not be validated.",
      };
    }

    return { ok: true, meal: parsed.meal };
  } catch (error) {
    return {
      ok: false,
      ...publicGeminiError(
        error,
        "Could not estimate that meal. Try a simpler description.",
      ),
    };
  }
}
