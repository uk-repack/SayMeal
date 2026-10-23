"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { OnboardingForm } from "@/components/onboarding-form";
import { ProfileGate } from "@/components/profile-gate";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import {
  fetchOwnProfile,
  type ProfileRecord,
} from "@/lib/profile/persist";

export default function OnboardingPage() {
  return (
    <ProfileGate>
      <OnboardingScreen />
    </ProfileGate>
  );
}

function OnboardingScreen() {
  const auth = useAuthUser();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "ready" || !auth.userId) return;

    let cancelled = false;
    void fetchOwnProfile().then((result) => {
      if (cancelled) return;
      setProfile(result.profile);
      setError(result.error);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, auth.userId]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <BrandHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-6">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm shadow-stone-900/5">
          {auth.userId && ready ? (
            <OnboardingForm
              userId={auth.userId}
              initialProfile={profile}
              onSaved={() => router.replace("/")}
            />
          ) : (
            <p className="text-sm text-stone-500" role="status">
              {error && !profile
                ? error
                : "Loading your profile…"}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
