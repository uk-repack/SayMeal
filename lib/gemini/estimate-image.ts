import { GoogleGenAI } from "@google/genai";
import { publicGeminiError } from "@/lib/gemini/errors";
import { GEMINI_MODEL, getGeminiApiKey } from "@/lib/gemini/env";
import {
  PHOTO_MEAL_ESTIMATE_JSON_SCHEMA,
  parseModelJsonText,
  parsePhotoEstimate,
  type EstimatedMeal,
} from "@/lib/meals/estimate";
import {
  NO_FOOD_PHOTO_ERROR,
  type AllowedImageMime,
} from "@/lib/meals/image";

const REQUEST_TIMEOUT_MS = 35_000;

const SYSTEM_INSTRUCTION = `You estimate nutrition from a meal photo.
Return only structured JSON matching the schema.
If the image is not food, is too unclear, or you cannot identify edible items, set foods_found to false and items to [].
Do not invent a typical meal.
Estimate only what can reasonably be inferred from the image.
Do not claim exact weight, hidden cooking oil, or ingredients you cannot see.
For mixed dishes, name the dish, use a cautious portion in grams, and put uncertainty in assumptions and item notes.
Calories and macros must be non-negative estimates for those portions.
These are visual estimates, not lab values or medical advice.`;

export type EstimateImageResult =
  | { ok: true; meal: EstimatedMeal }
  | { ok: false; status: number; error: string };

export async function estimateMealFromImage(input: {
  bytes: Uint8Array;
  mimeType: AllowedImageMime;
}): Promise<EstimateImageResult> {
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
      contents: [
        {
          inlineData: {
            mimeType: input.mimeType,
            data: Buffer.from(input.bytes).toString("base64"),
          },
        },
        {
          text: "Identify visible foods in this meal photo and estimate nutrition.",
        },
      ],
      config: {
        abortSignal: abort,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: PHOTO_MEAL_ESTIMATE_JSON_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText?.trim()) {
      return {
        ok: false,
        status: 502,
        error: "The estimate came back empty. Try another photo.",
      };
    }

    const parsed = parsePhotoEstimate(parseModelJsonText(rawText), "Photo meal");
    if (!parsed.meal) {
      const noFood = parsed.error === NO_FOOD_PHOTO_ERROR;
      return {
        ok: false,
        status: noFood ? 422 : 502,
        error: parsed.error ?? "The estimate could not be validated.",
      };
    }

    return { ok: true, meal: parsed.meal };
  } catch (error) {
    return {
      ok: false,
      ...publicGeminiError(
        error,
        "Could not estimate that photo. Try another image.",
      ),
    };
  }
}
