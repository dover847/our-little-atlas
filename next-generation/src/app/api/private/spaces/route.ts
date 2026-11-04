import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json(
        { error: "Sign in to open your spaces." },
        { status: 401, headers },
      );
    // User-scoped JWT + database RLS. No service-role client in application code.
    const { data, error } = await supabase.from("spaces").select("id, name");
    if (error)
      return Response.json(
        { error: "Your spaces are temporarily unavailable." },
        { status: 503, headers },
      );
    return Response.json({ spaces: data }, { headers });
  } catch {
    return Response.json(
      { error: "Your spaces are temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
