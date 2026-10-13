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
const PRECIO_POR_DEFECTO = 55;

/**
 * El precio de hoy, en dolares.
 *
 * Se puede cambiar SIN volver a desplegar, con el secreto PRECIO_USD del
 * Worker. Sirve para probar el cobro de verdad con 1 USD y volver a 55
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

type Tasa = { trm: number; fuente: string };

/**
 * De donde se saca el dolar. En orden.
 *
 * NO hay numero escrito a mano en ningun lado. Antes habia un "suelo" de
 * 3800 por si todo fallaba, y envejecio mal: el peso se fortalecio, la TRM
 * quedo en 3.194 y ese suelo habria cobrado un 19% de mas sin que nadie se
 * diera cuenta. Un precio escrito a mano siempre termina mintiendo.
 *
 * La primera es la TRM oficial de la Superfinanciera, que es la tasa que
 * vale legalmente en Colombia. Las otras dos son la tasa de mercado —la
 * misma que muestra Google cuando uno busca "dolar a peso"—, y estan solo
 * por si la del Estado se cae, que se cae.
 *
 * Son tres servicios de tres duenos distintos a proposito: que se caigan
 * los tres a la vez es casi imposible. Y si pasa, NO se cobra: mejor que
 * el cliente reintente en un minuto que cobrarle un numero inventado.
 */
const FUENTES: { nombre: string; url: string; leer: (j: unknown) => number }[] = [
  {
    // Datos abiertos del Estado. La TRM oficial.
    nombre: "TRM oficial",
    url: "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC",
    leer: (j) => Number((j as { valor?: string | number }[])?.[0]?.valor),
  },
  {
    nombre: "tasa de mercado (respaldo)",
    url: "https://open.er-api.com/v6/latest/USD",
    leer: (j) => Number((j as { rates?: Record<string, number> })?.rates?.COP),
  },
  {
    // Servido por jsDelivr, que es una red de entrega enorme: aguanta
    // cuando los otros dos no.
    nombre: "tasa de mercado (segundo respaldo)",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    leer: (j) => Number((j as { usd?: Record<string, number> })?.usd?.cop),
  },
];

/**
 * Un valor con sentido para USD/COP.
 *
 * Esto es la reja de verdad. Una fuente que responde "1" o "0.00031"
 * —porque cambio de formato, o porque devolvio la tasa al reves— pasaria
 * cualquier chequeo de "es un numero mayor que cero" y cobraria 55 pesos
 * por el mes. El rango es ancho a proposito: no es para adivinar el precio,
 * es para cazar una respuesta descompuesta.
 */
function tasaCreible(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v >= 1000 && v <= 20000;
}

/** Cache en memoria. El Worker vive poco, pero dentro de una misma invocacion
 *  no tiene sentido pedir la TRM dos veces. */
let cache: { t: number; tasa: Tasa } | null = null;
const CACHE_MS = 60 * 60 * 1000; // una hora: la TRM cambia una vez al dia

async function conTiempo(url: string, ms = 6000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

/** Lo que se lanza cuando no hay de donde sacar el dolar. */
export class SinTasaError extends Error {
  constructor() {
    super(
      "No pudimos consultar el precio del dólar en este momento. " +
        "Espera un minuto y vuelve a intentarlo.",
    );
    this.name = "SinTasaError";
  }
}

/**
 * El dolar de hoy.
 *
 * Se apunta de cual fuente salio: si algun dia hay que discutir un cobro,
 * importa saber si fue la oficial o una de mercado.
 */
export async function trmHoy(): Promise<Tasa> {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.tasa;

  for (const f of FUENTES) {
    try {
      const r = await conTiempo(f.url);
      if (!r.ok) {
        console.error(`trmHoy: ${f.nombre} respondió ${r.status}`);
        continue;
      }

      const v = f.leer(await r.json());
      if (!tasaCreible(v)) {
        console.error(`trmHoy: ${f.nombre} devolvió un valor que no cuadra: ${v}`);
        continue;
      }

      const tasa = { trm: v, fuente: f.nombre };
      cache = { t: Date.now(), tasa };
      return tasa;
    } catch (e) {
      console.error(`trmHoy: ${f.nombre} falló — ${e instanceof Error ? e.message : e}`);
    }
  }

  // Las tres caidas. No se inventa un numero: se para el cobro.
  console.error("trmHoy: las tres fuentes fallaron, no se cobra");
  throw new SinTasaError();
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
