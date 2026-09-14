"use client";

import { useMemo, useState } from "react";
import MediaPicker, { type Media } from "@/components/MediaPicker";

export type CuentaFila = {
  id: string;
  platform: "facebook" | "instagram";
  name: string;
  picture_url: string | null;
  last_error: string | null;
};

type Resultado = {
  ok: boolean;
  name: string;
  error?: string;
  remoteId?: string;
  commentError?: string | null;
};

export default function Composer({ cuentas }: { cuentas: CuentaFila[] }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(cuentas.map((c) => c.id)));
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [comentario, setComentario] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [cuando, setCuando] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const igSinMedia = useMemo(
    () => cuentas.some((c) => sel.has(c.id) && c.platform === "instagram") && media === null,
    [cuentas, sel, media],
  );

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function enviar() {
    setBusy(true);
    setError(null);
    setResultados(null);
    setAviso(null);

    try {
      const r = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          link,
          media: media ? [{ url: media.url, path: media.path, type: media.type }] : [],
          firstComment: comentario,
          accountIds: [...sel],
          scheduledAt: cuando ? new Date(cuando).toISOString() : null,
        }),
      });

      const j = (await r.json()) as {
        error?: string;
        scheduled?: boolean;
        results?: Resultado[];
        ok?: number;
        total?: number;
        /** Destinos que no cupieron en esta tanda y salen solos en minutos. */
        quedan?: number;
      };
      if (!r.ok) throw new Error(j.error ?? "Falló la publicación");

      if (j.scheduled) {
        setAviso(`Programado para el ${new Date(cuando).toLocaleString("es")}.`);
      } else {
        setResultados(j.results ?? []);

        if (j.quedan && j.quedan > 0) {
          setAviso(
            `Van ${j.ok} de las primeras ${j.total}. Faltan ${j.quedan} cuentas y salen solas ` +
              `en unos minutos — no cierres nada, esto sigue por su cuenta.`,
          );
        }

        if (j.ok === j.total && !j.quedan) {
          setMessage("");
          setLink("");
          setComentario("");
          // El archivo ya lo borró el servidor al publicar: aquí solo soltamos
          // la referencia, sin pedir borrado otra vez.
          setMedia(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const vacio = !message.trim() && media === null && !link.trim();

  return (
    /* `minmax(0,1fr)` y no `1fr`: sin eso, un renglón largo sin espacios
       —una URL pegada— estira la columna y desborda la rejilla entera.
       Y se parte en `lg`, no en `md`: a 768 px las dos columnas salen
       apretadas y se lee peor que una debajo de otra. */
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      {/* ---------- contenido ---------- */}
      <div className="card space-y-5">
        <div>
          <label className="label" htmlFor="msg">
            Mensaje
          </label>
          <textarea
            id="msg"
            className="input min-h-36 resize-y sm:min-h-44"
            placeholder="¿Qué quieres publicar?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="archivo">
            Imagen o video
          </label>
          <MediaPicker media={media} onChange={setMedia} onError={setError} />
        </div>

        <div>
          <label className="label" htmlFor="link">
            Enlace — solo Facebook, y se ignora si pusiste imagen
          </label>
          <input
            id="link"
            className="input"
            placeholder="https://tusitio.com"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="comentario">
            Primer comentario — opcional
          </label>
          <textarea
            id="comentario"
            className="input min-h-20 resize-y"
            placeholder="Aquí van los enlaces y los hashtags"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
            Se publica como comentario tuyo apenas sale el post. Es donde conviene meter
            enlaces y hashtags: así el post no pierde alcance.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="cuando">
            Programar — déjalo vacío para publicar ya
          </label>
          <input
            id="cuando"
            type="datetime-local"
            className="input"
            value={cuando}
            onChange={(e) => setCuando(e.target.value)}
          />
        </div>

        {/* El botón va aquí, pegado a los campos que se acaban de llenar.
            Antes vivía en la tarjeta de Destinos: en el computador se veía
            bien porque esa columna se queda pegada al bajar, pero en el
            teléfono las columnas se apilan y el botón terminaba al final de
            todo, después de la lista de cuentas. Había que bajar a buscarlo.

            Los avisos van con él y no al final: de nada sirve decir
            "Instagram no acepta solo texto" a un metro del sitio donde se
            aprieta. */}
        <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {igSinMedia && (
            <p className="text-sm text-amber-600">
              Instagram no acepta publicaciones de solo texto. Agrega una imagen o quita las
              cuentas de Instagram.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {aviso && <p className="text-sm text-green-600">{aviso}</p>}

          <button
            className="btn btn-primary w-full"
            onClick={enviar}
            disabled={busy || vacio || sel.size === 0 || igSinMedia}
          >
            {busy
              ? "Publicando..."
              : cuando
                ? `Programar en ${sel.size} cuenta${sel.size === 1 ? "" : "s"}`
                : `Publicar en ${sel.size} cuenta${sel.size === 1 ? "" : "s"}`}
          </button>

          {/* Por qué está apagado. Un botón gris sin explicación se lee como
              "esto está roto". */}
          {!busy && (vacio || sel.size === 0) && (
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              {vacio ? "Escribe algo o adjunta una imagen." : "Marca al menos una cuenta."}
            </p>
          )}
        </div>

        {resultados && (
          <ul className="space-y-1.5 text-sm">
            {resultados.map((r, i) => (
              <li key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                {r.ok ? "✓" : "✗"} {r.name}
                {r.error ? ` — ${r.error}` : ""}
                {r.commentError && (
                  <span className="block pl-4 text-xs text-amber-600">
                    El post salió, pero no se pudo comentar: {r.commentError}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- destinos ----------
           En el computador se queda pegada al bajar, para poder marcar y
           desmarcar cuentas mientras se escribe. El `top` deja sitio a la
           barra de arriba, que también es pegajosa.

           En el teléfono va DEBAJO del botón: primero escribes y publicas,
           y solo bajas aquí si quieres cambiar los destinos —que casi
           siempre son todos. */}
      <div className="card h-fit lg:sticky lg:top-[72px]">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Destinos</p>
          <div className="flex gap-1.5">
            <button
              className="btn btn-ghost !px-2 !py-1 text-xs"
              onClick={() => setSel(new Set(cuentas.map((c) => c.id)))}
            >
              Todas
            </button>
            <button
              className="btn btn-ghost !px-2 !py-1 text-xs"
              onClick={() => setSel(new Set())}
            >
              Ninguna
            </button>
          </div>
        </div>

        <ul className="mt-3 space-y-1">
          {cuentas.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:brightness-95">
                <input
                  type="checkbox"
                  checked={sel.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="shrink-0"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.picture_url ?? ""}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                  style={{ background: "var(--background)" }}
                />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
                  {c.platform === "instagram" ? "IG" : "FB"}
                </span>
              </label>
            </li>
          ))}
        </ul>

      </div>
    </div>
  );
}
