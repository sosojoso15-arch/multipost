import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Aterrizaje del enlace de confirmacion que manda Supabase por correo.
 *
 * Supabase puede mandar el enlace de dos formas segun la plantilla:
 *
 *   ?token_hash=...&type=signup   sirve en CUALQUIER aparato
 *   ?code=...                     flujo PKCE: solo sirve en el MISMO
 *                                 navegador donde se registro
 *
 * El segundo se rompe todo el tiempo en la vida real: la gente se registra
 * en el computador y abre el correo en el celular. Por eso la plantilla de
 * Supabase deberia usar {{ .TokenHash }}. Aguantamos los dos igual.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/panel";

  const falla = (motivo: string, reenviar = false) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(motivo)}${reenviar ? "&reenviar=1" : ""}`,
    );

  // Supabase mismo puede venir con un error puesto
  const errDesc = searchParams.get("error_description");
  if (errDesc) return falla(traducir(errDesc), true);

  const sb = await supabaseServer();

  // ---- el bueno: sirve en cualquier aparato ----
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return falla(traducir(error.message), true);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // ---- PKCE: solo en el mismo navegador ----
  const code = searchParams.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return falla(traducir(error.message), true);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return falla("El enlace no traía el código de confirmación.", true);
}

/**
 * Los errores de Supabase vienen en ingles y de tecnico. A un cliente eso
 * no le dice nada y parece que la app se rompio.
 */
function traducir(msg: string): string {
  const m = msg.toLowerCase();

  if (m.includes("code verifier") || m.includes("different browser")) {
    return (
      "Abriste el enlace en un aparato distinto al que usaste para registrarte. " +
      "Pídenos otro correo y ábrelo en el mismo teléfono o computador."
    );
  }
  if (m.includes("expired")) {
    return "El enlace ya venció. Pídenos otro y ábrelo enseguida.";
  }
  if (m.includes("already") || m.includes("used")) {
    return "Ese enlace ya se usó. Entra normal con tu correo y contraseña.";
  }
  if (m.includes("invalid") || m.includes("not found")) {
    return "El enlace no sirve. Pídenos otro.";
  }
  return msg;
}
