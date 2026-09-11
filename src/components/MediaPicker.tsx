"use client";

import { useRef, useState } from "react";

export type Media = {
  url: string;
  path?: string;
  type: "image" | "video";
  name?: string;
  size?: number;
};

function pesoLegible(bytes?: number) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function MediaPicker({
  media,
  onChange,
  onError,
}: {
  media: Media | null;
  onChange: (m: Media | null) => void;
  onError: (msg: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [encima, setEncima] = useState(false);

  // Salida para videos de mas de 50 MB, que es el tope del plan gratis
  // de Supabase. Si el archivo ya vive en internet, no hay que subirlo.
  const [modoUrl, setModoUrl] = useState(false);
  const [urlPegada, setUrlPegada] = useState("");
  const [tipoPegado, setTipoPegado] = useState<"image" | "video">("video");

  function usarUrl() {
    const u = urlPegada.trim();
    if (!/^https:\/\/\S+$/i.test(u)) {
      onError("Tiene que ser una URL que empiece por https:// y sea pública.");
      return;
    }
    onError(null);
    onChange({ url: u, type: tipoPegado, name: u.split("/").pop() || "archivo" });
    setUrlPegada("");
    setModoUrl(false);
  }

  async function subir(file: File) {
    onError(null);
    setSubiendo(true);
    setProgreso(0);

    try {
      const fd = new FormData();
      fd.append("file", file);

      // XHR y no fetch: es la unica forma de tener barra de progreso real.
      const m = await new Promise<Media>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/media");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgreso(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          let j: { error?: string } & Partial<Media> = {};
          try {
            j = JSON.parse(xhr.responseText);
          } catch {
            return reject(new Error("El servidor respondió algo raro"));
          }
          if (xhr.status >= 200 && xhr.status < 300 && j.url && j.type) {
            resolve(j as Media);
          } else {
            reject(new Error(j.error ?? `Falló la subida (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Se cortó la conexión al subir"));
        xhr.send(fd);
      });

      onChange(m);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setSubiendo(false);
      setProgreso(0);
    }
  }

  async function quitar() {
    const actual = media;
    onChange(null);
    onError(null);

    // Si ya estaba arriba, lo sacamos para no dejar basura.
    if (actual?.path) {
      try {
        await fetch("/api/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: actual.path }),
        });
      } catch {
        // Que falle no importa: el archivo queda huérfano y ya.
      }
    }
  }

  // ---------- ya hay archivo ----------
  if (media) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg p-3"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        {media.type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={media.url}
            alt=""
            className="h-16 w-16 shrink-0 rounded object-cover"
            style={{ border: "1px solid var(--border)" }}
          />
        ) : (
          <video
            src={media.url}
            className="h-16 w-16 shrink-0 rounded object-cover"
            style={{ border: "1px solid var(--border)" }}
            muted
            playsInline
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{media.name ?? "Archivo"}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {media.type === "image" ? "Imagen" : "Video"}
            {media.size ? ` · ${pesoLegible(media.size)}` : ""}
          </p>
        </div>

        <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={quitar}>
          Quitar
        </button>
      </div>
    );
  }

  // ---------- subiendo ----------
  if (subiendo) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-medium">Subiendo… {progreso}%</p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${progreso}%`, background: "var(--brand)" }}
          />
        </div>
      </div>
    );
  }

  // ---------- pegar URL ----------
  if (modoUrl) {
    return (
      <div
        className="space-y-3 rounded-lg p-4"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold">Pega la dirección del archivo</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Sirve para videos de más de 50 MB. Tiene que ser un enlace público y directo al
          archivo — Meta lo descarga desde ahí.
        </p>

        <input
          className="input"
          placeholder="https://.../video.mp4"
          value={urlPegada}
          onChange={(e) => setUrlPegada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              usarUrl();
            }
          }}
        />

        <select
          className="input"
          value={tipoPegado}
          onChange={(e) => setTipoPegado(e.target.value as "image" | "video")}
          aria-label="Tipo de archivo"
        >
          <option value="video">Video</option>
          <option value="image">Imagen</option>
        </select>

        <div className="flex gap-2">
          <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={usarUrl}>
            Usar esta URL
          </button>
          <button
            type="button"
            className="btn btn-ghost !py-1.5 text-xs"
            onClick={() => {
              setModoUrl(false);
              onError(null);
            }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // ---------- vacio ----------
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void subir(f);
        }}
        className="w-full rounded-lg px-4 py-6 text-center transition"
        style={{
          background: encima ? "var(--surface)" : "var(--background)",
          border: `1.5px dashed ${encima ? "var(--brand)" : "var(--border)"}`,
        }}
      >
        <p className="text-sm font-semibold">Arrastra una imagen o video</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          o haz clic para buscarlo en tu computador
        </p>
        <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
          JPG, PNG, WEBP, GIF, MP4 o MOV · hasta 50 MB
        </p>
      </button>

      <button
        type="button"
        className="mt-2 text-xs underline"
        style={{ color: "var(--muted)" }}
        onClick={() => setModoUrl(true)}
      >
        ¿Video de más de 50 MB? Pega una URL
      </button>

      <input
        ref={input}
        type="file"
        id="archivo"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void subir(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
