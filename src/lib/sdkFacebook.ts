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

/**
 * Carga el SDK una sola vez, aunque se llame varias veces.
 *
 * Hay que llamarlo AL ABRIR LA PANTALLA, no al hacer clic. Si se carga
 * dentro del clic, para cuando el SDK esta listo el navegador ya no
 * considera que la ventana de Facebook la pidio el usuario, y la bloquea:
 * el boton se queda esperando una respuesta que no llega nunca. En el
 * telefono pasa siempre.
 */
export function precargarSdk(appId: string, version = "v23.0"): Promise<void> {
  return cargar(appId, version);
}

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
export function pedirPermisoFacebook(opts: {
  configId: string | null;
}): Promise<string> {
  /* Nada de `await` antes de FB.login: cualquier espera aqui hace que el
     navegador bloquee la ventana por no venir del toque. El SDK ya tiene que
     estar cargado desde que se abrio la pantalla. */
  if (!window.FB) {
    return Promise.reject(
      new Error("El conector de Facebook no terminó de cargar. Espera un segundo y reintenta."),
    );
  }

  return new Promise<string>((resolve, reject) => {
    // Si Facebook no contesta, no dejar el boton girando para siempre.
    const plazo = setTimeout(() => {
      reject(
        new Error(
          "Facebook no respondió. Puede que tu navegador haya bloqueado la ventana: " +
            "permite las ventanas emergentes para este sitio y reintenta.",
        ),
      );
    }, 90_000);

    const responder = (f: () => void) => {
      clearTimeout(plazo);
      f();
    };

    window.FB!.login(
      (r) => {
        const token = r?.authResponse?.accessToken;
        if (token) return responder(() => resolve(token));

        responder(() =>
          reject(
            new Error(
              r?.status === "unknown"
                ? "Cancelaste el permiso, o Facebook cerró la ventana."
                : "Facebook no dio el permiso. Revisa que hayas aceptado la invitación.",
            ),
          ),
        );
      },
      opts.configId
        ? { config_id: opts.configId, response_type: "token", override_default_response_type: true }
        : { scope: PERMISOS, return_scopes: true },
    );
  });
}
