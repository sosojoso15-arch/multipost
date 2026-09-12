"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Estado = "ninguna" | "pendiente" | "listo" | "rechazado";

const ENLACE = "https://www.facebook.com/settings?tab=developer";

/**
 * El camino corto: en vez de crear su propia app de Meta, el cliente nos
 * deja su usuario de Facebook y nosotros lo metemos como Tester.
 *
 * Un Tester puede usar todos los permisos sin App Review. Es manual de
 * nuestro lado, pero para el cliente es escribir una linea y esperar.
 */
export default function PedirAcceso({
  estado,
  refGuardada,
  nombreGuardado,
  pistaGuardada,
  correoGuardado,
  nota,
}: {
  estado: Estado;
  refGuardada: string | null;
  nombreGuardado: string | null;
  pistaGuardada: string | null;
  correoGuardado: string | null;
  nota: string | null;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(refGuardada ?? "");
  const [nombre, setNombre] = useState(nombreGuardado ?? "");
  const [pista, setPista] = useState(pistaGuardada ?? "");
  const [correo, setCorreo] = useState(correoGuardado ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Los tres primeros son obligatorios: sin nombre se puede invitar a la
     cuenta equivocada, y sin correo el aviso no llega a ninguna parte. */
  const completo = valor.trim() !== "" && nombre.trim() !== "" && correo.trim() !== "";

  async function pedir() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookRef: valor, nombreFb: nombre, pista, correoAviso: correo }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo enviar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  // ---------- ya le dieron acceso ----------
  if (estado === "listo") {
    return (
      <div className="card" style={{ borderColor: "rgba(16,128,74,.45)" }}>
        <p className="font-semibold">Ya te dimos acceso — falta un paso tuyo</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--muted)" }}>
          <li>
            Abre{" "}
            <a
              href={ENLACE}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
              style={{ color: "var(--brand)" }}
            >
              la configuración de desarrollador de Facebook
            </a>
          </li>
          <li>
            Busca la invitación de <b>Multi-Post</b> y acéptala.
          </li>
          <li>Vuelve aquí y conecta tus páginas.</li>
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={ENLACE} target="_blank" rel="noreferrer" className="btn btn-primary">
            Ir a aceptar la invitación ↗
          </a>
          <button className="btn btn-ghost" onClick={() => router.refresh()}>
            Ya la acepté
          </button>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Esa invitación <b>no llega por correo</b>: vive escondida en la configuración de Facebook.
          Por eso te dejamos el enlace directo.
        </p>
      </div>
    );
  }

  // ---------- esperando ----------
  if (estado === "pendiente") {
    return (
      <div className="card" style={{ borderColor: "rgba(154,100,7,.45)" }}>
        <p className="font-semibold">Estamos preparando tu acceso</p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
          Pediste acceso como <b className="font-mono">{refGuardada}</b>. Te avisamos al correo
          apenas esté listo — normalmente el mismo día.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Corregir mis datos
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="fbref2">
                Usuario o correo de Facebook
              </label>
              <input
                id="fbref2"
                className="input"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="nombre2">
                Tu nombre en Facebook
              </label>
              <input
                id="nombre2"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
              />
            </div>
            <div>
              <label className="label" htmlFor="pista2">
                Algo más para reconocerte
              </label>
              <textarea
                id="pista2"
                className="input min-h-20 resize-y"
                value={pista}
                onChange={(e) => setPista(e.target.value)}
                maxLength={500}
              />
            </div>
            <div>
              <label className="label" htmlFor="correo2">
                Correo donde avisarte
              </label>
              <input
                id="correo2"
                className="input"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost" onClick={pedir} disabled={busy || !completo}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </details>
        {error && (
          <p className="mt-2 text-sm" style={{ color: "#c2352f" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // ---------- rechazada ----------
  if (estado === "rechazado") {
    return (
      <div className="card" style={{ borderColor: "#e0b4b4" }}>
        <p className="font-semibold">No pudimos darte acceso por esta vía</p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
          {nota ?? "Puedes seguir por el camino largo: crear tu propia app de Meta, aquí abajo."}
        </p>
      </div>
    );
  }

  // ---------- todavía no ha pedido ----------
  return (
    <div className="card" style={{ borderColor: "var(--brand)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
        Camino corto — recomendado
      </p>
      <h2 className="mt-1.5 font-semibold">Nosotros te conectamos</h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
        Déjanos tu cuenta de Facebook y te damos acceso. No tienes que crear ninguna app ni tocar
        nada en Meta.
      </p>

      <div className="mt-4">
        <label className="label" htmlFor="fbref">
          Tu usuario o correo de Facebook
        </label>
        <input
          id="fbref"
          className="input"
          placeholder="tucorreo@gmail.com o tu.usuario"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valor.trim()) {
              e.preventDefault();
              void pedir();
            }
          }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Tiene que ser el de tu cuenta <b>de Facebook</b>, que no siempre es el mismo con el que te
          registraste aquí. Si no coincide, no te vamos a encontrar.
        </p>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="nombrefb">
          Tu nombre tal como aparece en Facebook
        </label>
        <input
          id="nombrefb"
          className="input"
          placeholder="Andrés Suárez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={120}
          required
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Cópialo igualito de tu perfil, con tildes y todo. Es lo que evita que invitemos a otra
          persona con un correo parecido.
        </p>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="pista">
          Algo más para reconocerte — opcional
        </label>
        <textarea
          id="pista"
          className="input min-h-20 resize-y"
          placeholder="Cómo se ve tu foto de perfil, tu ciudad, tu página…"
          value={pista}
          onChange={(e) => setPista(e.target.value)}
          maxLength={500}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Si hay varios con tu mismo nombre, esto desempata.
        </p>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="correoAviso">
          Correo donde avisarte
        </label>
        <input
          id="correoAviso"
          className="input"
          type="email"
          placeholder="tucorreo@gmail.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Ahí te escribimos cuando el acceso esté listo. Pon uno que mires.
        </p>
      </div>

      <button className="btn btn-primary mt-5" onClick={pedir} disabled={busy || !completo}>
        {busy ? "Enviando…" : "Pedir acceso"}
      </button>

      {error && (
        <p className="mt-2 text-sm" style={{ color: "#c2352f" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
