"use client";

import { useCallback, useState } from "react";
import type { Solicitud } from "@/lib/testers";

function Copiar({ texto, children }: { texto: string; children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-3 !py-1.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* si el navegador no deja, se selecciona a mano */
        }
      }}
    >
      {ok ? "¡Copiado!" : children}
    </button>
  );
}

function Etiqueta({ estado }: { estado: Solicitud["estado"] }) {
  const estilo =
    estado === "listo"
      ? { color: "#10804a", background: "rgba(16,128,74,.12)" }
      : estado === "rechazado"
        ? { color: "#c2352f", background: "rgba(194,53,47,.12)" }
        : { color: "#9a6407", background: "rgba(154,100,7,.14)" };

  return (
    <span className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase" style={estilo}>
      {estado}
    </span>
  );
}

export default function AdminTesters({ inicial }: { inicial: Solicitud[] }) {
  /* La lista llega ya hecha desde el servidor: nada de pedirla en un efecto,
     que deja un parpadeo de "Cargando" y ademas es lo que ESLint senala con
     razon. Solo se vuelve a pedir DESPUES de tocar algo. */
  const [lista, setLista] = useState<Solicitud[]>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  /** Cuando no hay servicio de correo, aquí queda el texto para mandarlo a mano. */
  const [aMano, setAMano] = useState<{ para: string; cuerpo: string } | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/testers");
      const j = (await r.json()) as { solicitudes?: Solicitud[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo cargar");
      setLista(j.solicitudes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  async function marcar(id: string, estado: Solicitud["estado"]) {
    setOcupado(id);
    setError(null);
    setAMano(null);
    try {
      const r = await fetch("/api/admin/testers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      const j = (await r.json()) as {
        error?: string;
        correoEnviado?: boolean;
        para?: string;
        cuerpo?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "No se pudo guardar");

      // Sin servicio de correo: se le entrega el texto al dueño para que lo
      // mande por donde quiera. El flujo no se queda a medias por eso.
      if (estado === "listo" && !j.correoEnviado && j.cuerpo) {
        setAMano({ para: j.para ?? "", cuerpo: j.cuerpo });
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  const filas = lista;
  const pendientes = filas.filter((s) => s.estado === "pendiente");
  const resueltas = filas.filter((s) => s.estado !== "pendiente");

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm" style={{ color: "#c2352f" }} role="alert">
          {error}
        </p>
      )}

      {/* ---- el texto para mandar a mano ---- */}
      {aMano && (
        <div className="card" style={{ borderColor: "var(--brand)" }}>
          <p className="font-semibold">No hay servicio de correo configurado</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Mándale esto tú a <b style={{ color: "var(--foreground)" }}>{aMano.para}</b>, por
            WhatsApp o por donde hablen.
          </p>
          <pre
            className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg p-3 text-xs leading-relaxed"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            {aMano.cuerpo}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Copiar texto={aMano.cuerpo}>Copiar mensaje</Copiar>
            {aMano.para && <Copiar texto={aMano.para}>Copiar correo</Copiar>}
            <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setAMano(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ---- pendientes ---- */}
      <section>
        <h2 className="font-semibold">Esperando ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Nadie pidiendo acceso ahora mismo.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pendientes.map((s) => (
              <li key={s.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">{s.facebook_ref}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      {s.correo ?? "sin correo"} ·{" "}
                      {new Date(s.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <Copiar texto={s.facebook_ref}>Copiar usuario</Copiar>
                </div>

                <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                  Mételo como <b>Tester</b> en tu app de Meta, y después dale a Listo.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary !px-3 !py-1.5 text-xs"
                    disabled={ocupado === s.id}
                    onClick={() => marcar(s.id, "listo")}
                  >
                    {ocupado === s.id ? "Guardando…" : "Ya lo invité — avisarle"}
                  </button>
                  <button
                    className="btn btn-ghost !px-3 !py-1.5 text-xs"
                    disabled={ocupado === s.id}
                    onClick={() => marcar(s.id, "rechazado")}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- resueltas ---- */}
      {resueltas.length > 0 && (
        <section>
          <h2 className="font-semibold">Resueltas ({resueltas.length})</h2>
          <ul className="mt-3 space-y-1.5">
            {resueltas.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--border)" }}
              >
                <span className="font-mono text-xs">{s.facebook_ref}</span>
                <Etiqueta estado={s.estado} />
                {s.estado === "listo" && !s.avisado_at && (
                  <span className="text-[11px]" style={{ color: "#9a6407" }}>
                    sin avisar por correo
                  </span>
                )}
                <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
                  {s.correo}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
