import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// JTracker is single-user and login-optional: every app route gets an anonymous
// session on first visit so the user can start tracking immediately. Only the
// auth callback is excluded. Google sign-in later attaches to the same user.
const NO_AUTOSESSION = [/^\/auth\//];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Do not run code between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !NO_AUTOSESSION.some((re) => re.test(pathname))) {
    await supabase.auth.signInAnonymously();
  }

  return supabaseResponse;
}
