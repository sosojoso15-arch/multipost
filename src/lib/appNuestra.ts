import { secreto } from "@/lib/env";

/**
 * NUESTRA app de Meta: la que usan los clientes del camino corto.
 *
 * Quien pide acceso y lo metemos como Evaluador no crea ninguna app: se
 * conecta con esta. Por eso el App Secret vive en el Worker y no en la base
 * — es nuestro, no de ellos.
 *
 * Si no esta configurada, el camino corto no puede terminar: el cliente
 * acepta la invitacion y despues no hay con que conectarlo.
 */
export type AppNuestra = {
  appId: string;
  appSecret: string;
  configId: string | null;
  graphVer: string;
};

export function appNuestra(): AppNuestra | null {
  const appId = secreto("META_APP_ID");
  const appSecret = secreto("META_APP_SECRET");
  if (!appId || !appSecret) return null;

  return {
    appId,
    appSecret,
    // Solo lo traen las apps de tipo Negocios, que usan config_id en vez
    // de scope. Si esta vacio se manda scope, como el login clasico.
    configId: secreto("META_CONFIG_ID") ?? null,
    graphVer: secreto("META_GRAPH_VER") ?? "v23.0",
  };
}

/** Lo que falta por configurar, para poder decirlo en vez de fallar callado. */
export function faltaDeAppNuestra(): string[] {
  return [!secreto("META_APP_ID") && "META_APP_ID", !secreto("META_APP_SECRET") && "META_APP_SECRET"]
    .filter(Boolean)
    .map(String);
}
