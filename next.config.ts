import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/**
 * Stamp the build with the commit it came from, so "did my deploy actually go
 * live?" is answerable by looking at Settings instead of guessing. Vercel sets
 * VERCEL_GIT_COMMIT_SHA on git-integration builds; a CLI deploy from a working
 * copy has to read git itself. Both fall back to "dev" rather than failing.
 */
function commitSha(): string {
  const fromVercel =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
