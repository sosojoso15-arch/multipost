/** Cosas que comparten las dos rutas del flujo OAuth de Meta. */

import { secreto } from "@/lib/env";

export const STATE_COOKIE = "mp_oauth_state";

/** La URL que el cliente tiene que autorizar en SU app. Una sola. */
export function redirectUri(): string {
  const base = secreto("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/meta/callback`;
}

/** Pagina minima que le habla a la ventana que abrio el popup y se cierra sola. */
export function popupResponse(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload).replace(/</g, "\u003c");
  const ok = payload.ok === true;

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Conectando…</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;
       min-height:100vh;background:#f6f7f9;color:#14161a;text-align:center;padding:24px}
  .b{max-width:380px}
  h1{font-size:17px;margin:0 0 6px}
  p{margin:0;color:#5c6470;font-size:14px}
</style>
<div class="b">
  <h1>${ok ? "Listo, ya quedó conectado" : "No se pudo conectar"}</h1>
  <p>${ok ? "Puedes cerrar esta ventana." : String(payload.error ?? "")}</p>
</div>
<script>
  try { window.opener && window.opener.postMessage(${json}, window.location.origin); } catch (e) {}
  ${ok ? "setTimeout(function(){ window.close(); }, 900);" : ""}
</script>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
