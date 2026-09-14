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

  const destino = ok
    ? `/panel/conectar?conectadas=${Number(payload.count ?? 0)}`
    : `/panel/conectar?fallo=${encodeURIComponent(String(payload.error ?? "No se pudo conectar"))}`;

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
  /* Dos formas de volver, segun como se abrio:

     - En ventana aparte (computador): se le avisa a la ventana que la abrio
       y esta se cierra sola.
     - En la MISMA pestana (telefono): no hay a quien avisarle, asi que se
       vuelve al panel con el resultado en la direccion. Esto hace falta
       porque en el movil las ventanas aparte se pierden, y ademas la app de
       Facebook se traga los enlaces a facebook.com. */
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(${json}, window.location.origin);
      ${ok ? "setTimeout(function(){ window.close(); }, 900);" : ""}
    } else {
      window.location.replace(${JSON.stringify(destino)});
    }
  } catch (e) {
    window.location.replace(${JSON.stringify(destino)});
  }
</script>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
