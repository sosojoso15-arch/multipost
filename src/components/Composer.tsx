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

type Resultado = { ok: boolean; name: string; error?: string; remoteId?: string };

export default function Composer({ cuentas }: { cuentas: CuentaFila[] }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(cuentas.map((c) => c.id)));
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
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
      };
      if (!r.ok) throw new Error(j.error ?? "Falló la publicación");

      if (j.scheduled) {
        setAviso(`Programado para el ${new Date(cuando).toLocaleString("es")}.`);
      } else {
        setResultados(j.results ?? []);
        if (j.ok === j.total) {
          setMessage("");
          setLink("");
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
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      {/* ---------- contenido ---------- */}
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="msg">
            Mensaje
          </label>
          <textarea
            id="msg"
            className="input min-h-36 resize-y"
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

        {igSinMedia && (
          <p className="text-sm text-amber-600">
            Instagram no acepta publicaciones de solo texto. Agrega una imagen o quita las cuentas
            de Instagram.
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

        {resultados && (
          <ul className="space-y-1.5 text-sm">
            {resultados.map((r, i) => (
              <li key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                {r.ok ? "✓" : "✗"} {r.name}
                {r.error ? ` — ${r.error}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- destinos ---------- */}
      <div className="card h-fit">
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
