/**
 * Wompi: armar el cobro y comprobar que el aviso de pago es de verdad.
 *
 * Dos secretos DISTINTOS, y confundirlos es el error clasico:
 *
 *   WOMPI_INTEGRITY_SECRET  firma lo que SALE hacia el checkout
 *   WOMPI_EVENTS_SECRET     comprueba lo que ENTRA por el webhook
 *
 * Ninguno de los dos sale nunca del servidor. La llave publica si puede ir al
 * navegador —para eso es publica—, pero aqui el enlace se arma entero en el
 * servidor, asi que tampoco hace falta.
 */
import { secreto, secretoObligatorio } from "@/lib/env";

/** El checkout de pruebas y el de verdad son el mismo sitio: lo que cambia es
 *  la llave. Una `pub_test_...` cobra de mentiras. */
const CHECKOUT = "https://checkout.wompi.co/p/";

/** SHA-256 en hexadecimal. En el Worker existe WebCrypto; no hace falta node. */
async function sha256(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Una referencia que no se repite.
 *
 * Wompi la exige unica: si se repite, el segundo cobro lo rechaza. Lleva el
 * usuario dentro para poder saber de quien es sin mirar la base, y un trozo al
 * azar para que nadie pueda adivinar la del vecino.
 */
export function nuevaReferencia(userId: string): string {
  const azar = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `mp-${userId.replace(/-/g, "").slice(0, 12)}-${Date.now()}-${azar}`;
}

/**
 * El enlace al checkout, ya firmado.
 *
 * La firma de integridad es lo que impide que alguien cambie el monto en la
 * URL y pague mil pesos por el mes. Se calcula CON EL SECRETO, que por eso
 * nunca puede salir al navegador.
 */
export async function enlaceDeCobro(opts: {
  referencia: string;
  amountInCents: number;
  redirectUrl: string;
  correo?: string | null;
  expiraEn?: Date;
}): Promise<string> {
  const llave = secretoObligatorio("WOMPI_PUBLIC_KEY");
  const integridad = secretoObligatorio("WOMPI_INTEGRITY_SECRET");
  const moneda = "COP";

  // El orden IMPORTA: referencia + monto + moneda + secreto. Cambiarlo da una
  // firma valida que Wompi rechaza, y el error que devuelve no dice cual es.
  const firma = await sha256(
    `${opts.referencia}${opts.amountInCents}${moneda}${integridad}`,
  );

  const p = new URLSearchParams({
    "public-key": llave,
    currency: moneda,
    "amount-in-cents": String(opts.amountInCents),
    reference: opts.referencia,
    "signature:integrity": firma,
    "redirect-url": opts.redirectUrl,
  });
  if (opts.correo) p.set("customer-data:email", opts.correo);
  if (opts.expiraEn) p.set("expiration-time", opts.expiraEn.toISOString());

  return `${CHECKOUT}?${p.toString()}`;
}

/** Lo que manda Wompi cuando una transaccion llega a su estado final. */
export type EventoWompi = {
  event?: string;
  environment?: string;
  timestamp?: number;
  sent_at?: string;
  signature?: { checksum?: string; properties?: string[] };
  data?: {
    transaction?: {
      id?: string;
      reference?: string;
      status?: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
      amount_in_cents?: number;
      currency?: string;
      customer_email?: string;
    };
  };
};

/** Saca un valor anidado por su camino: "transaction.status". */
function porCamino(obj: unknown, camino: string): unknown {
  return camino.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj,
  );
}

/**
 * ¿Este aviso lo mando Wompi de verdad?
 *
 * Sin esto, cualquiera que conozca la direccion del webhook puede mandar un
 * "APPROVED" inventado y regalarse un mes. Es la comprobacion mas importante
 * de todo el cobro.
 *
 * Las propiedades NO se escriben a mano: Wompi dice cuales son en
 * `signature.properties` y hay que leerlas de ahi, en ese orden. Clavarlas
 * aqui significa romperse el dia que Wompi anada una.
 */
export async function eventoEsDeWompi(ev: EventoWompi): Promise<boolean> {
  const secretoEventos = secreto("WOMPI_EVENTS_SECRET");
  if (!secretoEventos) {
    console.error("Falta WOMPI_EVENTS_SECRET: no se puede comprobar el aviso de pago");
    return false;
  }

  const props = ev?.signature?.properties;
  const recibido = ev?.signature?.checksum;
  const ts = ev?.timestamp;
  if (!Array.isArray(props) || !props.length || !recibido || ts == null) return false;

  let texto = "";
  for (const p of props) {
    const v = porCamino(ev.data, p);
    if (v === undefined || v === null) return false;
    texto += String(v);
  }
  texto += String(ts) + secretoEventos;

  const calculado = await sha256(texto);

  // Comparacion de tiempo constante: comparar con === deja medir cuantos
  // caracteres acerto quien lo intente, y con suficientes intentos se
  // adivina la firma entera.
  if (calculado.length !== recibido.length) return false;
  let dif = 0;
  for (let i = 0; i < calculado.length; i++) {
    dif |= calculado.charCodeAt(i) ^ recibido.toLowerCase().charCodeAt(i);
  }
  return dif === 0;
}
