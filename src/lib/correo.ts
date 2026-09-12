import { secreto } from "@/lib/env";

/**
 * Mandar correo, si hay con que.
 *
 * Hoy no hay servicio de correo contratado, y no queremos que eso frene
 * nada: si no esta configurado, esto devuelve `false` sin romper. El panel
 * de administracion entonces muestra el mensaje para copiarlo y mandarlo a
 * mano por WhatsApp o por donde sea.
 *
 * El dia que exista RESEND_API_KEY y CORREO_REMITENTE, empieza a salir
 * solo. No hay que tocar nada mas.
 *
 * Ojo si lo vas a configurar: para escribirle a CUALQUIER destinatario,
 * Resend exige un dominio propio verificado. Con el remitente de prueba
 * solo se puede escribir a la direccion del dueno de la cuenta.
 */
export type Correo = {
  para: string;
  asunto: string;
  /** Texto plano. Sin HTML a proposito: llega mejor y se lee en cualquier lado. */
  cuerpo: string;
};

export async function mandarCorreo(c: Correo): Promise<{ ok: boolean; motivo?: string }> {
  const llave = secreto("RESEND_API_KEY");
  const remitente = secreto("CORREO_REMITENTE");

  if (!llave || !remitente) {
    return { ok: false, motivo: "sin servicio de correo configurado" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [c.para],
        subject: c.asunto,
        text: c.cuerpo,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error(`correo: ${res.status} ${detalle.slice(0, 200)}`);
      return { ok: false, motivo: `el servicio respondió ${res.status}` };
    }

    return { ok: true };
  } catch (e) {
    console.error("correo:", e instanceof Error ? e.message : e);
    return { ok: false, motivo: "no se pudo contactar al servicio de correo" };
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

/** Donde acepta el cliente la invitación de Tester. No es un correo: está
 *  escondido en la configuración de Facebook y nadie lo encuentra solo. */
export const ENLACE_INVITACION = "https://www.facebook.com/settings?tab=developer";

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

Cuando aceptes, ya puedes conectar tus páginas y publicar.`;
}
