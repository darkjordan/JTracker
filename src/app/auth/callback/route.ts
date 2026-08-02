import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function fail(origin: string, reason: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(reason.slice(0, 200))}`
  );
}

// OAuth redirect target: exchanges the code for a session, then returns home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const providerError =
    searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(origin, providerError);
  if (!code) return fail(origin, "auth");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(origin, error.message);
  return NextResponse.redirect(`${origin}${next}`);
}
