/**
 * Todo lo que habla con la Graph API de Meta.
 * Siempre corre en el servidor: aqui viajan los tokens.
 */

export type GraphError = { message: string; code?: number; type?: string };

export class MetaError extends Error {
  code?: number;
  constructor(e: GraphError) {
    super(e.message);
    this.code = e.code;
  }
}

const BASE = "https://graph.facebook.com";

async function graph<T>(
  ver: string,
  path: string,
  opts: { method?: "GET" | "POST"; token: string; params?: Record<string, string> } ,
): Promise<T> {
  const method = opts.method ?? "GET";
  const params = new URLSearchParams({ ...opts.params, access_token: opts.token });

  const url = method === "GET" ? `${BASE}/${ver}${path}?${params}` : `${BASE}/${ver}${path}`;
  const res = await fetch(url, {
    method,
    body: method === "POST" ? params : undefined,
    cache: "no-store",
  });

  const json = (await res.json()) as T & { error?: GraphError };
  if (json.error) throw new MetaError(json.error);
  if (!res.ok) throw new MetaError({ message: `HTTP ${res.status}` });
  return json;
}

// ------------------------------------------------------------------
// Token de usuario: cambiar el corto (2h) por el largo (60 dias).
// Solo se puede si el usuario nos dio el App Secret de SU app.
// ------------------------------------------------------------------
export async function exchangeLongLivedToken(
  ver: string,
  appId: string,
  appSecret: string,
  shortToken: string,
): Promise<{ token: string; expiresIn: number }> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${BASE}/${ver}/oauth/access_token?${p}`, { cache: "no-store" });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: GraphError;
  };
  if (json.error) throw new MetaError(json.error);
  if (!json.access_token) throw new MetaError({ message: "Meta no devolvio token" });
  // 60 dias por defecto si Meta no lo dice
  return { token: json.access_token, expiresIn: json.expires_in ?? 60 * 24 * 3600 };
}

// ------------------------------------------------------------------
// Traer paginas de Facebook + su Instagram Business ligado
// ------------------------------------------------------------------
export type DiscoveredAccount = {
  platform: "facebook" | "instagram";
  externalId: string;
  name: string;
  pictureUrl: string | null;
  /** Token de pagina. Instagram usa el token de SU pagina de Facebook. */
  token: string;
};

type PageNode = {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    username?: string;
    profile_picture_url?: string;
  };
};

export async function discoverAccounts(ver: string, userToken: string): Promise<DiscoveredAccount[]> {
  const out: DiscoveredAccount[] = [];
  const fields =
    "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}";

  let after: string | undefined;
  do {
    const page: { data: PageNode[]; paging?: { cursors?: { after?: string }; next?: string } } =
      await graph(ver, "/me/accounts", {
        token: userToken,
        params: { limit: "100", fields, ...(after ? { after } : {}) },
      });

    for (const p of page.data ?? []) {
      out.push({
        platform: "facebook",
        externalId: p.id,
        name: p.name,
        pictureUrl: p.picture?.data?.url ?? null,
        token: p.access_token,
      });

      const ig = p.instagram_business_account;
      if (ig?.id) {
        out.push({
          platform: "instagram",
          externalId: ig.id,
          name: ig.username ? `@${ig.username}` : `Instagram de ${p.name}`,
          pictureUrl: ig.profile_picture_url ?? null,
          // Instagram se maneja con el token de la pagina de Facebook
          token: p.access_token,
        });
      }
    }

    after = page.paging?.next ? page.paging?.cursors?.after : undefined;
  } while (after);

  return out;
}

// ------------------------------------------------------------------
// Publicar en Facebook
// ------------------------------------------------------------------
export type PostContent = {
  message?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export async function publishFacebook(
  ver: string,
  pageId: string,
  token: string,
  c: PostContent,
): Promise<string> {
  if (c.videoUrl) {
    const r = await graph<{ id: string; post_id?: string }>(ver, `/${pageId}/videos`, {
      method: "POST",
      token,
      params: { file_url: c.videoUrl, ...(c.message ? { description: c.message } : {}) },
    });
    return r.post_id ?? r.id;
  }

  if (c.imageUrl) {
    const r = await graph<{ id: string; post_id?: string }>(ver, `/${pageId}/photos`, {
      method: "POST",
      token,
      params: { url: c.imageUrl, ...(c.message ? { caption: c.message } : {}) },
    });
    return r.post_id ?? r.id;
  }

  const r = await graph<{ id: string }>(ver, `/${pageId}/feed`, {
    method: "POST",
    token,
    params: {
      ...(c.message ? { message: c.message } : {}),
      ...(c.link ? { link: c.link } : {}),
    },
  });
  return r.id;
}

// ------------------------------------------------------------------
// Publicar en Instagram : SIEMPRE en dos pasos y SIEMPRE con media
// ------------------------------------------------------------------
export async function publishInstagram(
  ver: string,
  igId: string,
  token: string,
  c: PostContent,
): Promise<string> {
  if (!c.imageUrl && !c.videoUrl) {
    throw new MetaError({
      message: "Instagram exige una imagen o un video. No admite publicaciones de solo texto.",
    });
  }

  // 1. contenedor
  const container = await graph<{ id: string }>(ver, `/${igId}/media`, {
    method: "POST",
    token,
    params: c.videoUrl
      ? { media_type: "REELS", video_url: c.videoUrl, ...(c.message ? { caption: c.message } : {}) }
      : { image_url: c.imageUrl!, ...(c.message ? { caption: c.message } : {}) },
  });

  // 2. el video hay que esperarlo a que Meta lo procese
  if (c.videoUrl) {
    await waitForContainer(ver, container.id, token);
  }

  // 3. publicar
  const published = await graph<{ id: string }>(ver, `/${igId}/media_publish`, {
    method: "POST",
    token,
    params: { creation_id: container.id },
  });
  return published.id;
}

async function waitForContainer(ver: string, containerId: string, token: string) {
  const deadline = Date.now() + 120_000; // 2 min
  while (Date.now() < deadline) {
    const s = await graph<{ status_code: string; status?: string }>(ver, `/${containerId}`, {
      token,
      params: { fields: "status_code,status" },
    });
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR") {
      throw new MetaError({ message: s.status ?? "Instagram no pudo procesar el video" });
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new MetaError({ message: "Instagram tardo demasiado procesando el video" });
}

export function publish(
  platform: "facebook" | "instagram",
  ver: string,
  externalId: string,
  token: string,
  content: PostContent,
) {
  return platform === "instagram"
    ? publishInstagram(ver, externalId, token, content)
    : publishFacebook(ver, externalId, token, content);
}

// ------------------------------------------------------------------
// Flujo OAuth de servidor (reemplaza al SDK de JavaScript).
// El cliente solo tiene que autorizar UNA casilla en su app:
// "URIs de redireccionamiento OAuth validos".
// ------------------------------------------------------------------
export const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export function authorizeUrl(opts: {
  ver: string;
  appId: string;
  redirectUri: string;
  state: string;
  /**
   * Solo para apps de tipo Negocios, que traen "Facebook Login for Business".
   * Ese producto usa un config_id (donde el cliente ya eligio permisos y
   * paginas) en vez de scope. Si viene vacio, mandamos scope como siempre.
   */
  configId?: string | null;
}) {
  const p = new URLSearchParams({
    client_id: opts.appId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    response_type: "code",
    ...(opts.configId ? { config_id: opts.configId } : { scope: SCOPES }),
  });
  return `https://www.facebook.com/${opts.ver}/dialog/oauth?${p}`;
}

/** Cambia el ?code= que devuelve Meta por un token de usuario. */
export async function exchangeCodeForToken(opts: {
  ver: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<string> {
  const p = new URLSearchParams({
    client_id: opts.appId,
    client_secret: opts.appSecret,
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });

  const res = await fetch(`${BASE}/${opts.ver}/oauth/access_token?${p}`, { cache: "no-store" });
  const json = (await res.json()) as { access_token?: string; error?: GraphError };

  if (json.error) throw new MetaError(json.error);
  if (!json.access_token) throw new MetaError({ message: "Meta no devolvio token" });
  return json.access_token;
}

// ------------------------------------------------------------------
// Primer comentario: el enlace y los hashtags van aqui, no en el post,
// para no castigar el alcance. Mismo endpoint en Facebook y en Instagram.
//
// Instagram exige ademas el permiso instagram_manage_comments.
// ------------------------------------------------------------------
export async function comentar(
  ver: string,
  objetoId: string,
  token: string,
  mensaje: string,
): Promise<string> {
  const r = await graph<{ id: string }>(ver, `/${objetoId}/comments`, {
    method: "POST",
    token,
    params: { message: mensaje },
  });
  return r.id;
}
