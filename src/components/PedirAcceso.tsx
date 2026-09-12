"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Estado = "ninguna" | "pendiente" | "listo" | "rechazado";

const ENLACE = "https://www.facebook.com/settings?tab=developer";

/* Donde el cliente se hace desarrollador. Meta lo EXIGE para poder meter a
   alguien en un rol de la app: sin esto, al invitarlo sale
   "does not resolve to a valid user ID" y no hay forma de seguir. */
const ENLACE_DEV = "https://developers.facebook.com/";

/* Donde ve su nombre de usuario. Es el que va al final de la direccion de
   su perfil, y mucha gente no sabe que existe. */
const ENLACE_USUARIO = "https://www.facebook.com/settings?tab=account&section=username";

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
  const [esDev, setEsDev] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Los tres primeros son obligatorios: sin nombre se puede invitar a la
     cuenta equivocada, y sin correo el aviso no llega a ninguna parte. */
  const completo =
    valor.trim() !== "" && nombre.trim() !== "" && correo.trim() !== "" && esDev;

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
          <br />
          <span className="mt-1.5 block">
            Si no te registraste todavía en{" "}
            <a href={ENLACE_DEV} target="_blank" rel="noreferrer" className="underline">
              developers.facebook.com
            </a>
            , hazlo ahora: sin eso no te podemos invitar.
          </span>
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Corregir mis datos
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="fbref2">
                Nombre de usuario de Facebook
              </label>
              <input
                id="fbref2"
                className="input font-mono"
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
            <button
              className="btn btn-ghost"
              onClick={pedir}
              disabled={busy || !valor.trim() || !nombre.trim() || !correo.trim()}
            >
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
        No tienes que crear ninguna app. Son dos cosas rápidas y nosotros hacemos el resto.
      </p>

      {/* ---- paso previo: Meta exige que sea desarrollador ---- */}
      <div
        className="mt-4 rounded-lg p-3"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold">Antes que nada: regístrate como desarrollador</p>
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Es gratis y toma un minuto. Facebook lo exige para poder darte acceso — sin esto no
          podemos invitarte, aunque nos des bien tus datos.
        </p>
        <a href={ENLACE_DEV} target="_blank" rel="noreferrer" className="btn btn-ghost mt-3">
          Abrir developers.facebook.com ↗
        </a>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Entra con tu Facebook de siempre y acepta las condiciones. No hay que crear nada.
        </p>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 shrink-0"
            checked={esDev}
            onChange={(e) => setEsDev(e.target.checked)}
          />
          <span>Ya me registré como desarrollador</span>
        </label>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="fbref">
          Tu nombre de usuario de Facebook
        </label>
        <input
          id="fbref"
          className="input font-mono"
          placeholder="juan.suarez.123"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && completo) {
              e.preventDefault();
              void pedir();
            }
          }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Es lo que va al final de la dirección de tu perfil:{" "}
          <span className="font-mono">facebook.com/<b>juan.suarez.123</b></span>. No sirve el
          correo — Facebook no lo acepta ahí.{" "}
          <a
            href={ENLACE_USUARIO}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "var(--brand)" }}
          >
            Ver el mío
          </a>
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
