"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export function AnonymousSession() {
  useEffect(() => {
    if (!hasSupabasePublicEnv()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function ensureSession() {
      const { data: existing, error: sessionError } =
        await supabase.auth.getSession();

      if (cancelled) return;
      if (sessionError) {
        console.error("SnapBite: could not read auth session", sessionError);
        return;
      }
      if (existing.session) return;

      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (signInError) {
        console.error("SnapBite: anonymous sign-in failed", signInError);
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
