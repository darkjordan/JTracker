// Stable per-member color + short label so household transactions are
// distinguishable by who added them.
export type MemberBadge = { color: string; label: string };

const PALETTE = [
  "#6366f1", // indigo
  "#059669", // emerald
  "#e05a5a", // red
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

export function memberBadges(
  members: { user_id: string; email: string | null }[]
): Map<string, MemberBadge> {
  const sorted = [...members].sort((a, b) => a.user_id.localeCompare(b.user_id));
  const map = new Map<string, MemberBadge>();
  sorted.forEach((m, i) => {
    map.set(m.user_id, {
      color: PALETTE[i % PALETTE.length],
      label: m.email && m.email.includes("@") ? m.email.split("@")[0] : "Member",
    });
  });
  return map;
}
