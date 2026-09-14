import { secreto } from "@/lib/env";

/**
 * Mandar correo, si hay con que.
 *
 * Hoy no hay servicio de correo contratado, y no queremos que eso frene
 * nada: si no esta configurado, esto devuelve `false` sin romper. El panel
 * de administracion entonces muestra el mensaje para copiarlo y mandarlo a
 * mano por WhatsApp o por donde sea.
 *
 * Aguanta dos servicios, y usa el que este configurado:
 *
 *   BREVO_API_KEY   sirve SIN dominio propio. Se verifica una direccion
 *                   —un Gmail vale— y ya. Gratis hasta 300 al dia.
 *   RESEND_API_KEY  entrega mejor, pero para escribirle a cualquiera
 *                   exige un dominio propio verificado.
 *
 * Los dos necesitan CORREO_REMITENTE, que puede ir como
 * "Multi-Post <hola@ejemplo.com>" o solo el correo.
 */
export type Correo = {
  para: string;
  asunto: string;
  /** Texto plano. Sin HTML a proposito: llega mejor y se lee en cualquier lado. */
  cuerpo: string;
};

export async function mandarCorreo(c: Correo): Promise<{ ok: boolean; motivo?: string }> {
  const remitente = secreto("CORREO_REMITENTE");
  if (!remitente) {
    return { ok: false, motivo: "falta CORREO_REMITENTE" };
  }

  const brevo = secreto("BREVO_API_KEY");
  const resend = secreto("RESEND_API_KEY");

  if (brevo) return porBrevo(brevo, remitente, c);
  if (resend) return porResend(resend, remitente, c);

  return { ok: false, motivo: "sin servicio de correo configurado" };
}

/** Saca "Nombre <correo@x.com>" en sus dos partes. Brevo los quiere separados. */
function partirRemitente(r: string): { email: string; name?: string } {
  const m = r.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: r.trim() };
}

/**
 * Brevo. Es el que sirve sin dominio propio: basta con verificar UNA
 * direccion de correo —un Gmail vale— desde su panel. Gratis hasta 300
 * al dia, que para avisar invitaciones sobra.
 */
async function porBrevo(llave: string, remitente: string, c: Correo) {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": llave, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: partirRemitente(remitente),
        to: [{ email: c.para }],
        subject: c.asunto,
        textContent: c.cuerpo,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error(`correo/brevo: ${res.status} ${detalle.slice(0, 300)}`);
      return { ok: false, motivo: `Brevo respondió ${res.status}: ${detalle.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("correo/brevo:", e instanceof Error ? e.message : e);
    return { ok: false, motivo: "no se pudo contactar a Brevo" };
  }
}

/**
 * Resend. Mejor entrega, pero para escribirle a CUALQUIERA exige un
 * dominio propio verificado. Con el remitente de prueba solo se puede
 * escribir a la direccion del dueno de la cuenta.
 */
async function porResend(llave: string, remitente: string, c: Correo) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remitente, to: [c.para], subject: c.asunto, text: c.cuerpo }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error(`correo/resend: ${res.status} ${detalle.slice(0, 300)}`);
      return { ok: false, motivo: `Resend respondió ${res.status}: ${detalle.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("correo/resend:", e instanceof Error ? e.message : e);
    return { ok: false, motivo: "no se pudo contactar a Resend" };
  }
}

/**
 * Donde metes tu a la gente como Tester, en TU app.
 *
 * Sale de META_APP_ID, el App ID de la app con la que das acceso. Si no
 * esta puesto, se manda a la lista de apps y que la busque a mano.
 */
export function enlaceRoles(): string {
  const appId = secreto("META_APP_ID");
  return appId
    ? `https://developers.facebook.com/apps/${appId}/roles/roles/`
    : "https://developers.facebook.com/apps/";
}

/**
 * Donde acepta el cliente la invitacion. No llega por correo: vive escondida
 * y nadie la encuentra solo.
 *
 * Va a developers.facebook.com y NO a facebook.com/settings a proposito: en
 * el telefono, cualquier enlace a facebook.com lo secuestra la app, que no
 * tiene esa pantalla. El cliente termina en su muro sin entender nada.
 */
export const ENLACE_INVITACION = "https://developers.facebook.com/settings/developer/requests/";

/** El aviso de "ya te invité, ve y acepta". */
export function mensajeInvitado(appUrl: string): Correo["cuerpo"] {
  return `Ya te dimos acceso a Multi-Post.

Falta un paso tuyo, y es rápido:

1. Entra a ${ENLACE_INVITACION}
2. Busca la invitación de Multi-Post y acéptala
3. Vuelve a ${appUrl}/panel/conectar y dale a "Entrar con Facebook"

Esa invitación NO llega por correo: vive escondida en la configuración de
Facebook, por eso te pasamos el enlace directo.

Si no la ves ahí, casi siempre es porque todavía no te registraste como
desarrollador en https://developers.facebook.com — entra, acepta las
condiciones (es gratis y no hay que crear nada) y escríbenos para
invitarte de nuevo.

Ahí te va a pedir verificar un celular por SMS. Si te rebota, primero
agrega tu número aquí:
https://accountscenter.facebook.com/youraccount/contact_points/

Cuando aceptes, ya puedes conectar tus páginas y publicar.`;
}
