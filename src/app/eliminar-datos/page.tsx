import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminar mis datos — Multi-Post",
  description: "Cómo borrar tu cuenta y todos tus datos de Multi-Post.",
};

const CONTACTO = "suarezsotoandres7@gmail.com";

export default function EliminarDatosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-sm font-semibold underline" style={{ color: "var(--brand)" }}>
        ← Multi-Post
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Eliminar mis datos</h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        Tienes dos caminos. El primero corta el acceso de inmediato. El segundo borra todo.
      </p>

      <section className="card mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
          Opción 1 — inmediato, lo haces tú
        </p>
        <h2 className="mt-1.5 text-lg font-bold">Quítale el permiso a la app</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Desde Facebook, sin pedirnos nada y sin esperar:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--muted)" }}>
          <li>
            Entra a{" "}
            <a
              href="https://www.facebook.com/settings?tab=applications"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
              style={{ color: "var(--brand)" }}
            >
              facebook.com/settings → Apps y sitios web
            </a>
          </li>
          <li>Busca la app que usas con Multi-Post.</li>
          <li>
            Dale <b style={{ color: "var(--foreground)" }}>Eliminar</b>.
          </li>
        </ol>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Desde ese momento los accesos guardados dejan de servir y no podemos publicar nada más.
          Los datos que ya teníamos siguen en la base hasta que hagas la opción 2.
        </p>
      </section>

      <section className="card mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
          Opción 2 — borrado total
        </p>
        <h2 className="mt-1.5 text-lg font-bold">Pídenos que borremos todo</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Escribe a <b style={{ color: "var(--foreground)" }}>{CONTACTO}</b> desde el correo de tu
          cuenta, con el asunto:
        </p>
        <div
          className="mt-2 rounded-lg px-3 py-2 font-mono text-xs"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          Eliminar mi cuenta de Multi-Post
        </div>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Tiene que salir del mismo correo con el que te registraste. Es la forma de comprobar que
          eres tú.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="text-lg font-bold">Qué se borra</h2>
        <ul
          className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          <li>Tu cuenta y tu correo.</li>
          <li>El App ID, el Configuration ID y el App Secret cifrado de tu app de Meta.</li>
          <li>Todas tus páginas y cuentas de Instagram conectadas, con sus accesos.</li>
          <li>Todas tus publicaciones, programadas o ya enviadas, y sus resultados.</li>
        </ul>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Se borra de la base de datos, no se marca como oculto. Es definitivo y no se puede
          recuperar.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="text-lg font-bold">Qué NO se borra</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Lo que ya se publicó en Facebook o Instagram se queda ahí. Esas publicaciones son tuyas y
          viven en tus páginas, no en nuestros servidores. Si las quieres quitar, hazlo desde
          Facebook o Instagram.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="text-lg font-bold">Cuánto tarda</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Máximo <b style={{ color: "var(--foreground)" }}>30 días</b>, normalmente mucho menos. Te
          confirmamos por correo cuando esté hecho.
        </p>
      </section>

      <p className="mt-10 text-xs" style={{ color: "var(--muted)" }}>
        Ver también la{" "}
        <Link href="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </main>
  );
}
