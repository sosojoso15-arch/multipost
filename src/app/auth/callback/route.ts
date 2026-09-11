import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Aterrizaje del enlace de confirmacion que manda Supabase por correo.
 *
 * Supabase puede mandar el enlace de dos formas segun la plantilla:
 *   ?code=...                      -> flujo PKCE
 *   ?token_hash=...&type=signup    -> plantilla con {{ .TokenHash }}
 * Aguantamos las dos.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/panel/conectar";

  const falla = (motivo: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(motivo)}`);

  // Supabase mismo puede venir con un error puesto
  const errDesc = searchParams.get("error_description");
  if (errDesc) return falla(errDesc);

  const sb = await supabaseServer();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return falla(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return falla(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return falla("El enlace no traía el código de confirmación.");
}
