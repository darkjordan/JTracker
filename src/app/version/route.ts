import { BUILD_SHA, BUILD_TIME } from "@/lib/version";

// Machine-readable build stamp: `curl https://jtracker-my.vercel.app/version`
// answers "which commit is production actually serving?" without opening the
// app. Never cached — a cached answer here would defeat the entire point.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { sha: BUILD_SHA, builtAt: BUILD_TIME },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
