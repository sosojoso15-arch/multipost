import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role. Se salta el RLS.
 * SOLO para el cron de posts programados. Nunca importarlo desde el navegador.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para el cliente admin");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
