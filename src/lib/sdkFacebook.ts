"use client";

/**
 * El SDK de JavaScript de Facebook.
 *
 * Existe por el telefono. La vuelta normal de OAuth —mandar al cliente a
 * facebook.com y que vuelva— se la traga la app de Facebook, que reclama
 * esos enlaces para si y no sabe que hacer con la pantalla de permisos: abre
 * el perfil y ahi muere el flujo, sin volver nunca.
 *
 * El SDK no navega a ningun lado, asi que no hay enlace que interceptar.
 *
 * A cambio, la app de Meta tiene que autorizar el dominio —"Dominios
 * permitidos para el SDK de JavaScript"—. Eso antes lo hacia cada cliente en
 * SU app, y era medio asistente entero. Ahora la app es nuestra y se
 * configura una sola vez.
 */

type RespuestaLogin = {
  status: string;
  authResponse?: { accessToken?: string };
};

declare global {
  interface Window {
    FB?: {
      init: (o: Record<string, unknown>) => void;
      login: (cb: (r: RespuestaLogin) => void, o: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

/** Los mismos que pide el flujo de OAuth, para cuando no hay config_id. */
const PERMISOS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

let cargando: Promise<void> | null = null;

/** Carga el SDK una sola vez, aunque se llame varias veces. */
function cargar(appId: string, version: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (cargando) return cargando;

  cargando = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };

    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/es_LA/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onerror = () => {
      cargando = null;
      reject(new Error("No se pudo cargar el conector de Facebook. ¿Tienes bloqueador?"));
    };
    document.head.appendChild(s);
  });

  return cargando;
}

/**
 * Pide permiso y devuelve el token de usuario.
 *
 * `configId` es de las apps de tipo Negocios, que usan una configuracion en
 * vez de una lista de permisos suelta.
 */
export async function pedirPermisoFacebook(opts: {
  appId: string;
  configId: string | null;
  version?: string;
}): Promise<string> {
  await cargar(opts.appId, opts.version ?? "v23.0");

  return new Promise<string>((resolve, reject) => {
    window.FB!.login(
      (r) => {
        const token = r?.authResponse?.accessToken;
        if (token) return resolve(token);

        reject(
          new Error(
            r?.status === "unknown"
              ? "Cancelaste el permiso, o Facebook cerró la ventana."
              : "Facebook no dio el permiso. Revisa que hayas aceptado la invitación.",
          ),
        );
      },
      opts.configId
        ? { config_id: opts.configId, response_type: "token", override_default_response_type: true }
        : { scope: PERMISOS, return_scopes: true },
    );
  });
}
