/* `@ts-ignore` y no `@ts-expect-error`, a proposito.

   Este archivo lo genera `opennextjs-cloudflare build`. En un checkout
   limpio NO existe y TypeScript se queja; despues de compilar SI existe y
   entonces `@ts-expect-error` se queja de lo contrario —"directiva sin
   usar"— y tumba el build. O sea que fallaba en los dos casos, solo que en
   uno distinto cada vez.

   `@ts-ignore` calla si hay error y no protesta si no lo hay, que es justo
   lo que hace falta para algo que a veces esta y a veces no.
   ESLint prefiere `@ts-expect-error` por regla general, y tiene razon casi
   siempre. Aqui no: el archivo a veces esta y a veces no, asi que la
   directiva estricta falla la mitad de las veces. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ver arriba
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

/**
 * Entrada del Worker.
 *
 * El adaptador de Cloudflare solo genera un `fetch`. Nosotros lo envolvemos
 * para agregarle el `scheduled`, que es lo que dispara el Cron Trigger.
 *
 * El cron no sale a internet: le pasa la peticion directo al mismo handler,
 * sin dar la vuelta por DNS.
 */
const worker = {
  fetch: handler.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Record<string, string | undefined>,
    ctx: ExecutionContext,
  ) {
    // OJO con el respaldo: `multipost.workers.dev` NO es el dominio de este
    // Worker —el real lleva el subdominio de la cuenta—. Como la peticion no
    // sale a internet da igual para enrutar, pero cualquier codigo que arme
    // una URL absoluta a partir del host la armaria mal. Mejor el de verdad.
    const base = env.NEXT_PUBLIC_APP_URL ?? "https://multipost.asuarezdev.workers.dev";
    const secret = env.CRON_SECRET;

    if (!secret) {
      console.error("Falta CRON_SECRET: el cron no puede autenticarse");
      return;
    }

    const req = new Request(`${base.replace(/\/$/, "")}/api/cron/publish`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    ctx.waitUntil(
      handler
        .fetch(req, env, ctx)
        .then(async (res: Response) => {
          const cuerpo = await res.text();
          console.log(`cron ${res.status}: ${cuerpo.slice(0, 300)}`);
        })
        .catch((e: unknown) => console.error("cron reventó:", e)),
    );
  },
};

/* Con nombre y no suelto: un `export default {...}` anonimo no se puede
   nombrar en un stack trace ni recargar en caliente. */
export default worker;

// Si algun dia usamos cache con Durable Objects, aqui hay que reexportar
// DOQueueHandler y DOShardedTagCache desde ./.open-next/worker.js
