import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { updateSupabaseSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
