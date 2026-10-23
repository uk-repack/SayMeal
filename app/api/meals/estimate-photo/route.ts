import { NextResponse } from "next/server";
import { estimateMealFromImage } from "@/lib/gemini/estimate-image";
import { GEMINI_MODEL, hasGeminiApiKey } from "@/lib/gemini/env";
import { validateImageBytes } from "@/lib/meals/image";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Send a meal photo as form data." },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Choose a meal photo first." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = validateImageBytes(bytes, file.type);
  if (!checked.mime) {
    return NextResponse.json(
      { error: checked.error ?? "Use a JPEG, PNG, or WebP photo." },
      { status: 400 },
    );
  }

  const result = await estimateMealFromImage({
    bytes,
    mimeType: checked.mime,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    estimate: result.meal,
    labeledAs: "estimate",
    model: GEMINI_MODEL,
    source: "photo",
  });
}
