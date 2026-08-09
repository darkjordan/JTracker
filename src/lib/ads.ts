export function isWithinGracePeriod(
  createdAt: string | Date,
  graceDays: number,
  now: Date = new Date()
): boolean {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  return ageMs < graceDays * 86_400_000;
}
