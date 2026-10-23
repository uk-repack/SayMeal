import { NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json(
      {
        userId: null,
        isAnonymous: false,
        error: "Supabase public env is not configured.",
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({
      userId: null,
      isAnonymous: false,
      error: error?.message ?? null,
    });
  }

  return NextResponse.json({
    userId: data.user.id,
    isAnonymous: Boolean(data.user.is_anonymous),
    error: null,
  });
}
