import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Web Share Target: the OS share sheet POSTs the shared image here. Stages
// it in the private `shared-captures` bucket, then redirects to the
// Dashboard with ?shared=<path> — the client picks it up from there and
// feeds it into the existing scan-capture review flow (no second capture
// pipeline).
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const f = formData.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* malformed share payload — fall through to plain redirect */
  }

  if (!user || !file) {
    return NextResponse.redirect(`${origin}/`, 303);
  }

  const ext = file.type.split("/")[1] || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("shared-captures")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.redirect(`${origin}/`, 303);
  }

  return NextResponse.redirect(
    `${origin}/?shared=${encodeURIComponent(path)}`,
    303
  );
}
