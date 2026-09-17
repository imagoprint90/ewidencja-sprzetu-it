import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Odbiera link z e-maila (logowanie przez link / reset hasła), wymienia kod na
// sesję i przekierowuje dalej (domyślnie na Pulpit, albo tam gdzie wskazuje `dalej`).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const dalej = searchParams.get("dalej") || "/pulpit";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${dalej}`);
    }
  }

  return NextResponse.redirect(`${origin}/logowanie?blad=link_wygasl`);
}
