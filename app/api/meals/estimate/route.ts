import { NextResponse } from "next/server";
import { estimateMealFromText } from "@/lib/gemini/estimate-text";
import { GEMINI_TEXT_MODEL, hasGeminiApiKey } from "@/lib/gemini/env";
import { validateMealText } from "@/lib/meals/estimate";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json(
      { error: "Supabase public env is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Sign in is required to estimate a meal." },
      { status: 401 },
    );
  }

  if (!hasGeminiApiKey()) {
    return NextResponse.json(
      {
        error:
          "Meal estimates are not configured. Add GEMINI_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with a meal description." },
      { status: 400 },
    );
  }

  const textValue =
    body && typeof body === "object" && "text" in body
      ? (body as { text: unknown }).text
      : undefined;
  const { text, error: textError } = validateMealText(textValue);
  if (!text) {
    return NextResponse.json(
      { error: textError ?? "Describe what you ate." },
      { status: 400 },
    );
  }

  const result = await estimateMealFromText(text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    estimate: result.meal,
    labeledAs: "estimate",
    model: GEMINI_TEXT_MODEL,
  });
}
