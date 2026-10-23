import { handler, json } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const POST = handler({ auth: "none" }, async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return json({ ok: true });
});
