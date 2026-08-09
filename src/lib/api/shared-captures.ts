import { createClient } from "@/lib/supabase/client";

/** Download a share_target-staged image and clean it up afterward. */
export async function downloadSharedCapture(path: string): Promise<File> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("shared-captures")
    .download(path);
  if (error) throw error;
  const name = path.split("/").pop() ?? "shared-image";
  const file = new File([data], name, { type: data.type });
  // Best-effort cleanup — a stale staged file left behind isn't harmful
  // (private, per-user folder), so a failure here isn't worth surfacing.
  supabase.storage
    .from("shared-captures")
    .remove([path])
    .catch(() => {});
  return file;
}
