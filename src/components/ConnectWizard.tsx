"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Guardada = {
  app_id: string;
  graph_ver: string;
  config_id: string;
  tiene_secret: boolean;
};

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-2.5 !py-1 text-xs shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          // Si el navegador no deja copiar, el texto se puede seleccionar a mano.
        }
      }}
    >
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

/** Migaja que muestra el camino exacto dentro del menu de Meta. */
function Ruta({ pasos }: { pasos: string[] }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-xs"
      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
    >
      <p className="mb-1.5 font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Dónde queda en Meta
      </p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {pasos.map((p, i) => (
          <span key={p} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: "var(--muted)" }}>›</span>}
            <span className={i === pasos.length - 1 ? "font-semibold" : ""}>{p}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Valor({ texto }: { texto: string }) {
  return (
    <div
      className="mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs">{texto}</code>
      <Copiar texto={texto} />
    </div>
  );
}

/** Error o confirmacion, pegado al boton que lo produjo. */
function Aviso({ error, guardado }: { error: string | null; guardado: boolean }) {
  if (error) {
    return (
      <p className="text-sm font-medium" style={{ color: "#c2352f" }} role="alert">
        {error}
      </p>
    );
  }
  if (guardado) {
    return (
      <p className="text-sm font-medium" style={{ color: "#10804a" }}>
        Guardado.
      </p>
    );
  }
  return null;
}

function Paso({
  n,
  titulo,
  hecho,
  abierto,
  onToggle,
  children,
}: {
  n: number;
  titulo: string;
  hecho: boolean;
  abierto: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card !p-0 overflow-hidden"
      style={hecho ? { borderColor: "rgba(16,128,74,.45)" } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold"
          style={
            hecho
              ? { background: "#10804a", color: "#fff" }
              : {
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }
          }
        >
          {hecho ? "✓" : n}
        </span>
        <span className="flex-1 font-semibold">{titulo}</span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {hecho ? "Hecho" : "Falta"}
        </span>
      </button>
      {abierto && <div className="space-y-4 px-5 pb-5 pl-14">{children}</div>}
    </section>
  );
}

export default function ConnectWizard({
  redirectUri,
  appGuardada,
}: {
  redirectUri: string;
  appGuardada: Guardada | null;
}) {
  const router = useRouter();

  const [appId, setAppId] = useState(appGuardada?.app_id ?? "");
  const [graphVer, setGraphVer] = useState(appGuardada?.graph_ver ?? "v23.0");
  const [appSecret, setAppSecret] = useState("");
  const [configId, setConfigId] = useState(appGuardada?.config_id ?? "");
  const [guardada, setGuardada] = useState<Guardada | null>(appGuardada);

  const [abierto, setAbierto] = useState<number>(appGuardada ? 3 : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<number | null>(null);
  const [bloqueada, setBloqueada] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Con el App ID guardado podemos mandarlo a la pantalla exacta de SU app,
  // en vez de decirle "búscalo en el menú".
  const base = guardada ? `https://developers.facebook.com/apps/${guardada.app_id}` : null;
  const linkProductos = base ? `${base}/add/` : "https://developers.facebook.com/apps/";
  const linkLogin = base ? `${base}/fb-login/settings/` : "https://developers.facebook.com/apps/";
  const linkConfigs = base
    ? `${base}/fb-login/configurations/`
    : "https://developers.facebook.com/apps/";

  async function guardarApp(siguiente: number) {
    setBusy(true);
    setError(null);
    setGuardado(false);
    try {
      const r = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          graphVer,
          configId,
          appSecret: appSecret || undefined,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo guardar");

      setGuardada({ app_id: appId, graph_ver: graphVer, config_id: configId, tiene_secret: true });
      setAppSecret("");
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
      setAbierto(siguiente);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  // ---- lo que responde el popup al terminar ----
  const onMensaje = useCallback(
    (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data as { ok?: boolean; count?: number; error?: string };
      if (typeof d?.ok !== "boolean") return;

      setBusy(false);
      if (d.ok) {
        setListo(d.count ?? 0);
        setError(null);
        setBloqueada(false);
        router.refresh();
      } else {
        setError(d.error ?? "No se pudo conectar");
      }
    },
    [router],
  );

  useEffect(() => {
    window.addEventListener("message", onMensaje);
    return () => window.removeEventListener("message", onMensaje);
  }, [onMensaje]);

  function conectar() {
    setError(null);
    setBloqueada(false);
    setListo(null);
    setBusy(true);

    const w = window.open(
      "/api/meta/start",
      "conectar_meta",
      "width=620,height=780,menubar=no,toolbar=no",
    );

    if (!w) {
      setBusy(false);
      setError("Tu navegador bloqueó la ventana. Permite las ventanas emergentes y reintenta.");
      return;
    }

    // Si el cliente cierra la ventana sin volver, casi siempre es la URL sin autorizar.
    const timer = window.setInterval(() => {
      if (!w.closed) return;
      window.clearInterval(timer);
      setBusy((seguiaEsperando) => {
        if (seguiaEsperando) setBloqueada(true);
        return false;
      });
    }, 700);
  }

  return (
    <div className="space-y-3">
      {/* ---------------- 1 ---------------- */}
      <Paso
        n={1}
        titulo="Crea tu app en Meta"
        hecho={Boolean(guardada)}
        abierto={abierto === 1}
        onToggle={() => setAbierto(abierto === 1 ? 0 : 1)}
      >
        <ol className="list-decimal space-y-2 pl-4 text-sm" style={{ color: "var(--muted)" }}>
          <li>
            Entra a{" "}
            <a
              href="https://developers.facebook.com/apps/create/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
              style={{ color: "var(--brand)" }}
            >
              developers.facebook.com/apps/create
            </a>
          </li>
          <li>
            Caso de uso <b>Otro</b> → tipo <b>Empresa</b>.
          </li>
          <li>Ponle cualquier nombre y créala.</li>
        </ol>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Meta te deja parado en <b>Configuración de la app → Básica</b>. Ahí mismo sigue el paso 2.
        </p>
        <button className="btn btn-primary" onClick={() => setAbierto(2)}>
          Ya la creé
        </button>
      </Paso>

      {/* ---------------- 2 ---------------- */}
      <Paso
        n={2}
        titulo="Copia tus dos datos"
        hecho={Boolean(guardada)}
        abierto={abierto === 2}
        onToggle={() => setAbierto(abierto === 2 ? 0 : 2)}
      >
        <Ruta pasos={["Configuración de la app", "Básica"]} />

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Los dos están arriba del todo en esa pantalla. El secreto sale al darle <b>Mostrar</b>.
        </p>

        <div>
          <label className="label" htmlFor="appid">
            App ID
          </label>
          <input
            id="appid"
            className="input font-mono"
            inputMode="numeric"
            placeholder="123456789012345"
            value={appId}
            onChange={(e) => setAppId(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div>
          <label className="label" htmlFor="secret">
            App Secret
          </label>
          <input
            id="secret"
            className="input font-mono"
            type="password"
            placeholder={guardada?.tiene_secret ? "Ya guardado — déjalo vacío" : "32 caracteres"}
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value.trim())}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
            Se guarda cifrado y nunca se vuelve a mostrar. Es lo que hace que tus accesos no
            caduquen.
          </p>
        </div>

        <details className="text-xs" style={{ color: "var(--muted)" }}>
          <summary className="cursor-pointer">Versión de la API ({graphVer})</summary>
          <select
            className="input mt-2"
            value={graphVer}
            onChange={(e) => setGraphVer(e.target.value)}
            aria-label="Versión de la API"
          >
            {["v23.0", "v22.0", "v21.0", "v20.0"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </details>

        <button className="btn btn-primary" onClick={() => guardarApp(3)} disabled={busy || !appId}>
          {busy ? "Guardando..." : "Guardar y seguir"}
        </button>
        <Aviso error={error} guardado={guardado} />
      </Paso>

      {/* ---------------- 3 ---------------- */}
      <Paso
        n={3}
        titulo="Agrega el inicio de sesión y crea una configuración"
        hecho={listo !== null}
        abierto={abierto === 3}
        onToggle={() => setAbierto(abierto === 3 ? 0 : 3)}
      >
        <div
          className="rounded-lg px-3 py-2.5 text-sm"
          style={{ background: "rgba(217,164,6,.12)", border: "1px solid rgba(217,164,6,.4)" }}
        >
          <b>Este paso es el que todo el mundo se salta.</b> Sin él, la pantalla del paso 4 no
          existe en tu app. Es el más largo de todos: unos 60 segundos.
        </div>

        <Ruta pasos={["Menú izquierdo", "Productos", "Agregar producto"]} />

        <ol className="list-decimal space-y-2 pl-4 text-sm" style={{ color: "var(--muted)" }}>
          <li>
            Baja hasta <b>Inicio de sesión con Facebook para empresas</b> — está casi al final de
            la lista.
          </li>
          <li>
            Dale <b>Configurar</b>.
          </li>
        </ol>

        <a
          href={linkProductos}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ pointerEvents: guardada ? "auto" : "none", opacity: guardada ? 1 : 0.5 }}
        >
          Abrir &ldquo;Agregar producto&rdquo; de mi app ↗
        </a>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Si en tu lista aparece <b>Inicio de sesión con Facebook</b> a secas, ese también sirve.
          Depende del tipo de app que hayas creado.
        </p>

        <hr style={{ borderColor: "var(--border)" }} />

        <p className="text-sm font-semibold">Ahora crea una configuración</p>

        <Ruta
          pasos={[
            "Inicio de sesión con Facebook para empresas",
            "Configuraciones",
            "Crear configuración",
          ]}
        />

        <ol className="list-decimal space-y-2 pl-4 text-sm" style={{ color: "var(--muted)" }}>
          <li>Ponle cualquier nombre.</li>
          <li>
            En <b>Activos</b> marca <b>Páginas</b> y <b>Cuentas de Instagram</b>.
          </li>
          <li>
            En <b>Permisos</b> marca estos cinco:
            <div
              className="mt-1.5 rounded-lg px-3 py-2 font-mono text-xs"
              style={{ background: "var(--background)", border: "1px solid var(--border)" }}
            >
              pages_show_list
              <br />
              pages_read_engagement
              <br />
              pages_manage_posts
              <br />
              instagram_basic
              <br />
              instagram_content_publish
            </div>
          </li>
          <li>
            Guarda, y copia el <b>Configuration ID</b> que te queda.
          </li>
        </ol>

        <a
          href={linkConfigs}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ pointerEvents: guardada ? "auto" : "none", opacity: guardada ? 1 : 0.5 }}
        >
          Abrir &ldquo;Configuraciones&rdquo; de mi app ↗
        </a>

        <div>
          <label className="label" htmlFor="configid">
            Configuration ID
          </label>
          <input
            id="configid"
            className="input font-mono"
            inputMode="numeric"
            placeholder="Déjalo vacío si tu app usa el login clásico"
            value={configId}
            onChange={(e) => setConfigId(e.target.value.replace(/\D/g, ""))}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
            Las apps de tipo <b>Negocios</b> lo necesitan. Ahí es donde ya elegiste los permisos,
            por eso no los volvemos a pedir.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => guardarApp(4)} disabled={busy || !appId}>
          {busy ? "Guardando..." : "Guardar y seguir"}
        </button>
        <Aviso error={error} guardado={guardado} />
      </Paso>

      {/* ---------------- 4 ---------------- */}
      <Paso
        n={4}
        titulo="Pega una URL"
        hecho={listo !== null}
        abierto={abierto === 4}
        onToggle={() => setAbierto(abierto === 4 ? 0 : 4)}
      >
        <Ruta
          pasos={[
            "Menú izquierdo",
            "Inicio de sesión con Facebook",
            "Configuración",
            "URI de redireccionamiento de OAuth válidos",
          ]}
        />

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Es <b>una sola casilla</b>. Pega esto ahí:
        </p>

        <Valor texto={redirectUri} />

        <a
          href={linkLogin}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ pointerEvents: guardada ? "auto" : "none", opacity: guardada ? 1 : 0.5 }}
        >
          Abrir esa pantalla de mi app ↗
        </a>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Al pegar, baja hasta el final y dale <b>Guardar cambios</b>.
          <br />
          ¿No ves ese producto en el menú de la izquierda? Te faltó el paso 3.
        </p>
      </Paso>

      {/* ---------------- 5 ---------------- */}
      <Paso
        n={5}
        titulo="Conecta y trae tus páginas"
        hecho={listo !== null}
        abierto={abierto === 4 || abierto === 5}
        onToggle={() => setAbierto(abierto === 5 ? 0 : 5)}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Se abre una ventana de Facebook. <b>Marca todas las páginas</b> que quieras manejar: la
          que dejes sin marcar no aparece.
        </p>

        <button
          className="btn btn-primary"
          onClick={conectar}
          disabled={busy || !guardada}
          style={{ background: "#1877f2" }}
        >
          {busy ? "Esperando a Facebook..." : "Conectar con Facebook"}
        </button>

        {listo !== null && (
          <p className="text-sm font-semibold" style={{ color: "#10804a" }}>
            Listo: {listo} cuenta{listo === 1 ? "" : "s"} conectada{listo === 1 ? "" : "s"}.
          </p>
        )}
        <Aviso error={error} guardado={false} />
      </Paso>

      {/* ---------------- ayuda cuando falla ---------------- */}
      {bloqueada && (
        <div className="card text-sm" style={{ borderColor: "#e0b4b4" }}>
          <p className="font-semibold">¿Te salió &ldquo;URL bloqueada&rdquo;?</p>
          <p className="mt-1" style={{ color: "var(--muted)" }}>
            Entonces falta el paso 4. Esta URL tiene que estar pegada <b>igualita</b> en tu app:
          </p>
          <Valor texto={redirectUri} />
          <a href={linkLogin} target="_blank" rel="noreferrer" className="btn btn-ghost mt-3">
            Abrir esa pantalla ↗
          </a>
        </div>
      )}

    </div>
  );
}
