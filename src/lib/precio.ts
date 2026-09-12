import { secreto } from "@/lib/env";

/**
 * El precio, en dolares, cobrado en pesos.
 *
 * Wompi SOLO cobra en pesos colombianos. El precio esta puesto en dolares, asi
 * que hay que convertirlo cada vez, y el monto en pesos cambia todos los dias.
 *
 * Se usa la TRM oficial —la que publica la Superfinanciera— porque es la tasa
 * que vale legalmente en Colombia, no una cualquiera de internet.
 */

/** Lo que cuesta un mes, si nadie dice otra cosa. */
const PRECIO_POR_DEFECTO = 45;

/**
 * El precio de hoy, en dolares.
 *
 * Se puede cambiar SIN volver a desplegar, con el secreto PRECIO_USD del
 * Worker. Sirve para probar el cobro de verdad con 1 USD y volver a 45
 * despues, en dos comandos y sin tocar codigo.
 *
 * Un valor invalido se ignora y se usa el de siempre: es mejor cobrar de
 * mas por error que regalar el servicio por un dedazo en un secreto.
 */
export function precioUsd(): number {
  const n = Number(secreto("PRECIO_USD"));
  return Number.isFinite(n) && n > 0 ? n : PRECIO_POR_DEFECTO;
}

/** Cuantos dias da la prueba, y cuantos da un pago. */
export const DIAS_PRUEBA = 3;
export const DIAS_PLAN = 30;

/**
 * Si las dos fuentes fallan, este es el suelo.
 *
 * Cobrar de menos es peor que no cobrar: se entrega el servicio y se pierde
 * plata. Este numero esta por DEBAJO de la TRM real a proposito — no para
 * cobrar con el, sino para que un fallo se note al revisar los pagos en vez
 * de pasar callado.
 */
const TRM_SUELO = 3800;

type Tasa = { trm: number; fuente: string };

/** Cache en memoria. El Worker vive poco, pero dentro de una misma invocacion
 *  no tiene sentido pedir la TRM dos veces. */
let cache: { t: number; tasa: Tasa } | null = null;
const CACHE_MS = 60 * 60 * 1000; // una hora: la TRM cambia una vez al dia

async function conTiempo(url: string, ms = 6000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

/**
 * La TRM de hoy.
 *
 * Dos fuentes, no una: si la del gobierno esta caida —y se cae— el cobro no
 * se puede detener. La segunda no es la TRM oficial sino una tasa de mercado,
 * asi que se apunta de cual salio: si algun dia hay que discutir un cobro,
 * importa saberlo.
 */
export async function trmHoy(): Promise<Tasa> {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.tasa;

  // 1 · La oficial, de datos abiertos del Estado.
  try {
    const r = await conTiempo(
      "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC",
    );
    if (r.ok) {
      const j = (await r.json()) as { valor?: string | number }[];
      const v = Number(j?.[0]?.valor);
      if (Number.isFinite(v) && v > 0) {
        const tasa = { trm: v, fuente: "TRM oficial" };
        cache = { t: Date.now(), tasa };
        return tasa;
      }
    }
  } catch {
    // se intenta con la otra
  }

  // 2 · Tasa de mercado, de respaldo.
  try {
    const r = await conTiempo("https://open.er-api.com/v6/latest/USD");
    if (r.ok) {
      const j = (await r.json()) as { rates?: Record<string, number> };
      const v = Number(j?.rates?.COP);
      if (Number.isFinite(v) && v > 0) {
        const tasa = { trm: v, fuente: "tasa de mercado (respaldo)" };
        cache = { t: Date.now(), tasa };
        return tasa;
      }
    }
  } catch {
    // se cae al suelo
  }

  // 3 · Ni una ni otra. Se cobra por el suelo y se deja dicho.
  console.error("trmHoy: las dos fuentes fallaron, se cobra con el suelo");
  return { trm: TRM_SUELO, fuente: "suelo de seguridad" };
}

/**
 * Lo que hay que cobrar hoy, en centavos de peso, que es como lo pide Wompi.
 *
 * Se redondea hacia ARRIBA al peso entero. Cobrar 139.544,7 no existe, y
 * redondear hacia abajo es regalar centavos en cada cobro.
 */
export async function precioEnCentavos(): Promise<{
  amountInCents: number;
  trm: number;
  fuente: string;
  pesos: number;
}> {
  const { trm, fuente } = await trmHoy();
  const pesos = Math.ceil(precioUsd() * trm);
  return { amountInCents: pesos * 100, trm, fuente, pesos };
}

/** Para enseñarselo a la gente: "139.545 COP". */
export function enPesos(centavos: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}
