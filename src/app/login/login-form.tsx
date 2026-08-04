"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({
  errorMessage,
  next,
}: {
  errorMessage?: string;
  next?: string;
}) {
  // If a previous *link* attempt failed because the Google account already
  // belongs to someone, fall back to a normal sign-in on the next tap.
  const linkedElsewhere =
    !!errorMessage && /already linked|already been|identity/i.test(errorMessage);

  const [status, setStatus] = useState<"idle" | "redirecting">("idle");
  const [error, setError] = useState<string | null>(
    errorMessage
      ? linkedElsewhere
        ? "That Google account already has a JTracker account — tap to sign in to it."
        : errorMessage === "auth"
          ? "Sign-in didn’t complete. Please try again."
          : errorMessage
      : null
  );

  async function signIn() {
    setStatus("redirecting");
    setError(null);
    const supabase = createClient();
    const callback = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const options = { redirectTo: callback };
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Link Google to the anonymous session ONLY when it has data worth keeping
    // and we haven't already found the identity belongs elsewhere. Otherwise a
    // plain sign-in (which resolves to the existing Google account).
    let useLink = false;
    if (user?.is_anonymous && !linkedElsewhere) {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true });
      useLink = (count ?? 0) > 0;
    }

    const { error: authError } = useLink
      ? await supabase.auth.linkIdentity({ provider: "google", options })
      : await supabase.auth.signInWithOAuth({ provider: "google", options });

    if (authError) {
      setError(authError.message);
      setStatus("idle");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <button
        type="button"
        onClick={signIn}
        disabled={status === "redirecting"}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-2.5 font-semibold text-gray-700 transition active:scale-[0.99] hover:bg-gray-50 disabled:opacity-60"
      >
        <GoogleMark />
        {status === "redirecting" ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-center text-xs text-gray-500">
        Signing in keeps your data across devices. No passwords.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
