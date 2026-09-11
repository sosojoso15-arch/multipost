// @ts-expect-error — este archivo lo genera `opennextjs-cloudflare build`
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
export default {
  fetch: handler.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Record<string, string | undefined>,
    ctx: ExecutionContext,
  ) {
    const base = env.NEXT_PUBLIC_APP_URL ?? "https://multipost.workers.dev";
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

// Si algun dia usamos cache con Durable Objects, aqui hay que reexportar
// DOQueueHandler y DOShardedTagCache desde ./.open-next/worker.js
