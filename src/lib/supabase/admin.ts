import { createClient } from "@supabase/supabase-js";
import { secreto, describir } from "@/lib/env";

/**
 * Cliente con service role. Se salta el RLS.
 * SOLO para el cron de posts programados. Nunca importarlo desde el navegador.
 */
export function supabaseAdmin() {
  const url = secreto("NEXT_PUBLIC_SUPABASE_URL");
  const key = secreto("SUPABASE_SERVICE_ROLE_KEY");

  const faltan = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (faltan.length > 0) {
    // Solo NOMBRES, jamas valores. Es para poder diagnosticar sin filtrar nada.
    throw new Error(
      `Faltan estos secretos en el Worker: ${faltan.join(", ")}. ` +
        faltan.map((n) => `${n}: ${describir(String(n))}`).join(" | "),
    );
  }

  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
