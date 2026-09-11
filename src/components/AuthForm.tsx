"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const esRegistro = mode === "registro";

  // Si el enlace del correo falló, /auth/callback nos manda el motivo aquí.
  const errorDelEnlace = params.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();

    if (esRegistro) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setMsg({ text: error.message, ok: false });
      } else if (data.session) {
        router.push("/panel/conectar");
        router.refresh();
        return;
      } else {
        setMsg({
          text: "Listo. Te mandamos un correo para confirmar la cuenta. Ábrelo y vuelve aquí.",
          ok: true,
        });
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg({ text: error.message, ok: false });
      } else {
        router.push(params.get("next") ?? "/panel");
        router.refresh();
        return;
      }
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-20">
      <h1 className="text-2xl font-bold">{esRegistro ? "Crear cuenta" : "Entrar"}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {esRegistro ? "Gratis, 30 publicaciones al mes." : "Bienvenido de vuelta."}
      </p>

      {errorDelEnlace && !msg && (
        <div
          className="card mt-6 text-sm"
          style={{ borderColor: "#e0b4b4", color: "#b03030" }}
          role="alert"
        >
          <p className="font-semibold">El enlace del correo no sirvió</p>
          <p className="mt-1">{errorDelEnlace}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            minLength={6}
            autoComplete={esRegistro ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Un momento..." : esRegistro ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--muted)" }}>
        {esRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link href={esRegistro ? "/login" : "/registro"} className="font-semibold underline">
          {esRegistro ? "Entrar" : "Crear una"}
        </Link>
      </p>
    </main>
  );
}
