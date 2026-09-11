"use client";

import { useEffect, useState } from "react";

type Props = {
  plan: string;
  usados: number;
  limite: number;
  enPrueba: boolean;
  /** Cuando se acaba la prueba, o hasta cuando vale el plan pagado. */
  hasta: string | null;
  vencido: boolean;
};

/** Cuantos dias faltan, redondeando hacia arriba: si quedan 4 horas, queda
 *  "1 dia", no "0". Decirle a alguien que le quedan cero dias cuando todavia
 *  puede publicar es mentira. */
function diasHasta(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function Plan({ plan, usados, limite, enPrueba, hasta, vencido }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [precio, setPrecio] = useState<{ pesos?: string; trm?: number } | null>(null);

  const dias = diasHasta(hasta);

  /* El precio en pesos se muestra ANTES de hacer clic. Wompi solo cobra en
     pesos, asi que si el cliente ve "45 USD" y aterriza en una pantalla que
     dice $139.545 sin avisarle, parece otro precio y abandona. */
  useEffect(() => {
    let vivo = true;
    fetch("/api/pago/precio")
      .then((r) => r.json() as Promise<{ pesos?: string; trm?: number }>)
      .then((j) => {
        if (vivo && j?.pesos) setPrecio({ pesos: j.pesos, trm: j.trm });
      })
      .catch(() => {
        // Sin esto se muestra solo el precio en dolares. No es grave.
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function pagar() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/pago/checkout", { method: "POST" });
      const j = (await r.json()) as { url?: string; error?: string; texto?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? "No se pudo iniciar el pago");
      // Al checkout de Wompi. No se abre en pestana nueva a proposito: en el
      // movil las pestanas nuevas se pierden y la gente no vuelve.
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  /* Que se le dice, segun donde este. */
  let titulo: string;
  let detalle: string;
  let urge = false;

  if (vencido) {
    titulo = "Se te venció el plan";
    detalle = "Renuévalo para seguir publicando en todas tus páginas.";
    urge = true;
  } else if (enPrueba) {
    titulo = dias === 1 ? "Te queda 1 día de prueba" : `Te quedan ${dias} días de prueba`;
    detalle = "Después son 45 USD al mes. Wompi cobra en pesos, a la tasa del día.";
    urge = dias !== null && dias <= 1;
  } else if (plan !== "free") {
    titulo = `Plan ${plan}`;
    detalle =
      dias === null
        ? "Activo."
        : dias === 1
          ? "Se renueva mañana."
          : `Te quedan ${dias} días.`;
  } else {
    titulo = "Plan gratis";
    detalle = `${limite} publicaciones al mes. Con Pro son 1.000.`;
  }

  return (
    <div
      className="card"
      style={urge ? { borderColor: "var(--brand)" } : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-semibold">{titulo}</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
            {detalle}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            {usados} de {limite === 100000 ? "las que quieras" : limite} publicaciones este mes
          </p>
        </div>

        {(vencido || enPrueba || plan === "free") && (
          <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
            <button className="btn btn-primary" onClick={pagar} disabled={busy}>
              {busy ? "Abriendo el pago…" : vencido ? "Renovar — 45 USD" : "Pasar a Pro — 45 USD"}
            </button>
            <p className="text-center text-xs sm:text-right" style={{ color: "var(--muted)" }}>
              {precio?.pesos ? (
                <>
                  Hoy son <b style={{ color: "var(--foreground)" }}>{precio.pesos}</b>
                  <br />
                  Wompi cobra en pesos
                  {precio.trm ? `, a $${Math.round(precio.trm).toLocaleString("es-CO")} por dólar` : ""}
                </>
              ) : (
                "Se cobra en pesos, a la tasa del día"
              )}
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
