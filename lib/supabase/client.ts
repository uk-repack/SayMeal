import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, key } = getSupabasePublicEnv();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
