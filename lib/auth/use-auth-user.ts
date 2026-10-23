"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

type AuthState =
  | { status: "loading"; userId: null; error: null }
  | { status: "ready"; userId: string | null; error: string | null };

export function useAuthUser(): AuthState {
  const configured = hasSupabasePublicEnv();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session?.user) {
        setUserId(sessionData.session.user.id);
        setReady(true);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured) {
    return {
      status: "ready",
      userId: null,
      error: "Supabase is not configured.",
    };
  }

  if (!ready) {
    return { status: "loading", userId: null, error: null };
  }

  return { status: "ready", userId, error: null };
}
