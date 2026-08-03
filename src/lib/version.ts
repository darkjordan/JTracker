// Build identity, stamped in by next.config.ts at build time.
// Used to confirm a deployment actually reached the browser.

export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

/** "e4298bd · 3 Aug 2026, 19:30" — short enough for a footer line. */
export function buildLabel(
  sha: string = BUILD_SHA,
  iso: string = BUILD_TIME
): string {
  if (!iso) return sha;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return sha;
  // Malaysian local time: the user reads this on a phone in MYT.
  const when = d.toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${sha} · ${when}`;
}

/** How long ago this build was made, for spotting a stale cached bundle. */
export function buildAgeDays(iso: string = BUILD_TIME, now: Date = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}
