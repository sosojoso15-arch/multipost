import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Lee un secreto en tiempo de ejecucion.
 *
 * Ojo con esto, que nos costo caro: Next REEMPLAZA `process.env.LO_QUE_SEA`
 * por su valor durante el build, leyendolo de .env.local. Si ahi estaba
 * vacio, queda vacio para siempre en el bundle, y los secretos que subas
 * a Cloudflare despues no se usan nunca.
 *
 * Por eso aqui accedemos con corchetes y variable: asi Next no puede
 * reemplazarlo y de verdad se lee al momento. Y si no aparece, miramos
 * el `env` del Worker, que es donde viven los `wrangler secret`.
 */
export function secreto(nombre: string): string | undefined {
  const delProceso = process.env[nombre];
  if (delProceso) return delProceso;

  try {
    const { env } = getCloudflareContext();
    const valor = (env as unknown as Record<string, unknown>)?.[nombre];
    return typeof valor === "string" && valor ? valor : undefined;
  } catch (e) {
    console.error(
      `secreto("${nombre}"): no se pudo leer el entorno de Cloudflare — ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return undefined;
  }
}

/** Como `secreto`, pero revienta con un mensaje claro si falta. */
export function secretoObligatorio(nombre: string): string {
  const v = secreto(nombre);
  if (!v) throw new Error(`Falta el secreto ${nombre} en el Worker`);
  return v;
}


/**
 * Describe UN secreto sin revelarlo: de que tipo es y cuanto mide.
 * Nunca devuelve el contenido.
 */
export function describir(nombre: string): string {
  let delWorker: unknown;
  try {
    delWorker = (getCloudflareContext().env as unknown as Record<string, unknown>)?.[nombre];
  } catch {
    return "no pude leer el entorno del Worker";
  }

  if (delWorker === undefined) return "no existe en el Worker";
  if (typeof delWorker !== "string") return `es de tipo ${typeof delWorker}, no texto`;
  if (delWorker.trim() === "") return `es texto pero esta VACIO (largo ${delWorker.length})`;
  return `texto de ${delWorker.length} caracteres`;
}
