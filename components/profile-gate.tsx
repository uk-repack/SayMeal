"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import {
  fetchOwnProfile,
  isOnboarded,
  readOnboardedLocally,
} from "@/lib/profile/persist";

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <p className="text-center text-sm text-muted" role="status">
          {message}
        </p>
      </main>
    </div>
  );
}

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const auth = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const userId = auth.status === "ready" ? auth.userId : null;
  const [fetchedOnboarded, setFetchedOnboarded] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locallyOnboarded = userId ? readOnboardedLocally(userId) : false;
  const resolvedOnboarded =
    Boolean(userId) && (locallyOnboarded || fetchedOnboarded === true);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void fetchOwnProfile().then((result) => {
      if (cancelled) return;
      if (result.error && !result.profile) {
        setError(result.error);
        setFetchedOnboarded(false);
        return;
      }
      setError(null);
      setFetchedOnboarded(isOnboarded(result.profile));
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (fetchedOnboarded === null && !locallyOnboarded) return;
    if (!resolvedOnboarded && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [fetchedOnboarded, locallyOnboarded, resolvedOnboarded, pathname, router]);

  if (auth.status === "loading" || (userId && fetchedOnboarded === null && !locallyOnboarded)) {
    return <StatusScreen message="Getting your session…" />;
  }

  if (auth.status === "ready" && auth.error && !userId) {
    return <StatusScreen message={auth.error} />;
  }

  if (!userId) {
    return <StatusScreen message="Starting a private session…" />;
  }

  if (error && !resolvedOnboarded && pathname !== "/onboarding") {
    return <StatusScreen message={error} />;
  }

  if (!resolvedOnboarded && pathname !== "/onboarding") {
    return <StatusScreen message="Taking you to onboarding…" />;
  }

  return children;
}
