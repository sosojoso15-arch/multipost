import Link from "next/link";
import type { Metadata } from "next";
import { PRECIO_USD, DIAS_PRUEBA } from "@/lib/precio";

export const metadata: Metadata = {
  title: "Multi-Post — publica en todas tus páginas al mismo tiempo",
  description:
    "Escribe una vez y publica en todas tus páginas de Facebook y cuentas de Instagram. Programa, mira qué falló y por qué, y conserva el control de tus accesos.",
};

/* ---------------------------------------------------------------- *
 *  Piezas sueltas
 * ---------------------------------------------------------------- */

function Seccion({
  id,
  eyebrow,
  titulo,
  lede,
  children,
}: {
  id?: string;
  eyebrow?: string;
  titulo: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t py-16 sm:py-24" style={{ borderColor: "var(--border)" }}>
      <div className="shell">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--brand)" }}>
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 max-w-2xl text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          {titulo}
        </h2>
        {lede && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            {lede}
          </p>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/** Insignia FB / IG, igual que en el panel. */
function Chip({ ig }: { ig?: boolean }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
      style={{
        color: ig ? "#c9327f" : "var(--brand)",
        background: ig ? "rgba(201,50,127,.12)" : "rgba(24,119,242,.12)",
      }}
    >
      {ig ? "IG" : "FB"}
    </span>
  );
}

/**
 * Una muestra del panel de verdad, dibujada con CSS.
 *
 * No es una captura: una imagen se ve borrosa al escalar, pesa, y hay que
 * volver a hacerla cada vez que cambie el panel. Esto es la misma interfaz,
 * con los mismos colores del tema, y se lee igual de bien en claro y oscuro.
 */
function MuestraDelPanel() {
  const destinos = [
    { n: "Panadería La Espiga", ig: false, ok: true },
    { n: "@panaderialaespiga", ig: true, ok: true },
    { n: "Ferretería El Tornillo", ig: false, ok: true },
    { n: "Gimnasio Fuerza Local", ig: false, ok: true },
    { n: "Inmobiliaria Cardona", ig: false, ok: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl shadow-2xl"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* barra de ventana */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e06c5a" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e0b34c" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#5aab6e" }} />
        <span className="ml-3 font-mono text-[11px]" style={{ color: "var(--muted)" }}>
          Nueva publicación
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px] sm:p-5">
        {/* contenido */}
        <div className="space-y-3">
          <div
            className="rounded-lg p-3 text-sm leading-relaxed"
            style={{ border: "1px solid var(--border)", background: "var(--background)" }}
          >
            Abrimos el domingo desde las 7 a.m. 🥖
            <br />
            Pan de queso recién salido y café de origen.
          </div>

          <div
            className="flex items-center gap-3 rounded-lg p-2.5"
            style={{ border: "1px solid var(--border)", background: "var(--background)" }}
          >
            <span
              className="h-10 w-10 shrink-0 rounded"
              style={{ background: "linear-gradient(135deg,#c98a4b,#8a5a2b)" }}
            />
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              domingo-panaderia.jpg · 1,2 MB
            </span>
          </div>

          <div className="rounded-lg py-2.5 text-center text-sm font-semibold text-white" style={{ background: "var(--brand)" }}>
            Publicar en 5 cuentas
          </div>

          <ul className="space-y-1 text-xs">
            {destinos.map((d) => (
              <li key={d.n} style={{ color: d.ok ? "#2f8f5b" : "#c2564c" }}>
                {d.ok ? "✓" : "✗"} {d.n}
                {!d.ok && (
                  <span className="font-mono"> — (#190) el acceso venció</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* destinos */}
        <div
          className="h-fit rounded-lg p-3"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
        >
          <p className="mb-2 text-xs font-semibold">Destinos</p>
          <ul className="space-y-1.5">
            {destinos.map((d) => (
              <li key={d.n} className="flex items-center gap-2 text-xs">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm"
                  style={{ background: "var(--brand)" }}
                />
                <span className="flex-1 truncate">{d.n}</span>
                <Chip ig={d.ig} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  Contenido
 * ---------------------------------------------------------------- */

const PASOS = [
  {
    t: "Conecta tus páginas",
    d: "Una configuración de una sola vez, guiada paso a paso. Unos tres minutos, y no la vuelves a ver.",
  },
  {
    t: "Escribe una vez",
    d: "Tu texto, tu imagen o tu video, y el primer comentario donde van los enlaces y los hashtags.",
  },
  {
    t: "Elige dónde sale",
    d: "Marca las cuentas y publica, o déjalo programado para la hora que quieras.",
  },
];

const VENTAJAS = [
  {
    t: "Facebook e Instagram, a la vez",
    d: "Las dos redes desde la misma pantalla. Instagram se publica en sus dos pasos, con la espera del video incluida, sin que tengas que saberlo.",
  },
  {
    t: "Sabes qué falló y por qué",
    d: "Si una página rechaza el post, las demás siguen. Te mostramos el error exacto de esa página, con el código de Meta, no un “algo salió mal”.",
  },
  {
    t: "Programa y olvídate",
    d: "Deja el post listo para el domingo a las 7. Se publica solo, con el computador apagado.",
  },
  {
    t: "El primer comentario, automático",
    d: "Facebook e Instagram castigan el alcance de los posts con enlaces. Ponlos en el primer comentario y sale solo, apenas se publica.",
  },
  {
    t: "Tus accesos son tuyos",
    d: "Usas tu propia app de Meta. Los accesos se guardan cifrados y aislados: ni otro cliente ni nosotros los vemos en claro.",
  },
  {
    t: "Cuantas cuentas quieras",
    d: "Cinco páginas o cuarenta, cuesta lo mismo. Pensado para quien maneja las redes de varios negocios.",
  },
];

const PREGUNTAS = [
  {
    q: "¿Por qué tengo que crear mi propia app de Meta?",
    a: "Porque así el permiso es tuyo, no de un tercero. Es una configuración de una sola vez —te llevamos de la mano, son unos tres minutos— y a cambio tu cuenta no depende de que Meta apruebe a nadie más. Tus accesos nunca salen de tu control.",
  },
  {
    q: "¿Me piden la contraseña de Facebook?",
    a: "Nunca. El permiso se otorga dentro de Facebook y nosotros solo recibimos un acceso que tú puedes revocar cuando quieras, desde la configuración de tu cuenta.",
  },
  {
    q: "¿Qué necesita Instagram?",
    a: "Que la cuenta sea Business o Creator y esté ligada a una página de Facebook. Y siempre imagen o video: Instagram no admite publicaciones de solo texto, y la app te lo avisa antes de intentar.",
  },
  {
    q: "¿Puedo cancelar?",
    a: "Sí. No hay permanencia ni cláusulas. Se paga mes a mes y dejas de pagar cuando quieras.",
  },
  {
    q: "¿En qué moneda se cobra?",
    a: "El precio está en dólares y el cobro se hace en pesos colombianos, a la tasa oficial del día. Antes de pagar te mostramos el monto exacto en pesos.",
  },
];

/* ---------------------------------------------------------------- *
 *  Página
 * ---------------------------------------------------------------- */

export default function Home() {
  return (
    <>
      {/* ---------------- barra ---------------- */}
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
      >
        <div className="shell flex items-center gap-4 py-3">
          <span className="font-bold tracking-tight">Multi-Post</span>
          <nav className="ml-auto flex items-center gap-2">
            <Link href="#precio" className="hidden px-3 py-2 text-sm sm:block" style={{ color: "var(--muted)" }}>
              Precio
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Entrar
            </Link>
            <Link href="/registro" className="btn btn-primary">
              Empezar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------- portada ---------------- */}
        <section className="relative overflow-hidden">
          {/* Un resplandor tenue detrás del título. Decoración, nada más:
              por eso no lleva texto ni hace falta describirlo. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.18] blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--brand), transparent)" }}
          />

          <div className="shell relative py-16 sm:py-24">
            <div className="max-w-3xl">
              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Publica en todas tus páginas al mismo tiempo.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
                Un solo mensaje, todas tus páginas de Facebook y cuentas de Instagram. Sin copiar y
                pegar veinte veces.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/registro" className="btn btn-primary !px-6 !py-2.5 !text-base">
                  Empezar ahora
                </Link>
                <Link href="#como" className="btn btn-ghost !px-6 !py-2.5 !text-base">
                  Ver cómo funciona
                </Link>
              </div>

              <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
                {DIAS_PRUEBA} días de prueba · sin tarjeta · cancelas cuando quieras
              </p>
            </div>

            <div className="mt-14 sm:mt-16">
              <MuestraDelPanel />
            </div>
          </div>
        </section>

        {/* ---------------- cómo funciona ---------------- */}
        <Seccion
          id="como"
          eyebrow="Cómo funciona"
          titulo="Tres pasos, y el primero solo se hace una vez."
        >
          <ol className="grid gap-6 sm:grid-cols-3">
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <span
                  className="grid h-9 w-9 place-items-center rounded-full font-mono text-sm font-semibold"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{p.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {p.d}
                </p>
              </li>
            ))}
          </ol>
        </Seccion>

        {/* ---------------- ventajas ---------------- */}
        <Seccion
          eyebrow="Qué hace"
          titulo="Lo que cambia cuando dejas de publicar a mano."
          lede="Manejar varias páginas no es escribir más: es repetir lo mismo muchas veces y perder el hilo de qué salió y qué no."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VENTAJAS.map((v) => (
              <div key={v.t} className="card">
                <h3 className="font-semibold">{v.t}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {v.d}
                </p>
              </div>
            ))}
          </div>
        </Seccion>

        {/* ---------------- precio ---------------- */}
        <Seccion
          id="precio"
          eyebrow="Precio"
          titulo="Un solo plan. Todas las cuentas que necesites."
          lede="Sin escalones ni sorpresas: da igual si manejas tres páginas o treinta."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
            <div className="card" style={{ borderColor: "var(--brand)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                Plan Pro
              </p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">{PRECIO_USD} USD</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  / mes
                </span>
              </p>
              <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
                Se cobra en pesos, a la tasa oficial del día.
              </p>

              <Link href="/registro" className="btn btn-primary mt-5 w-full !py-2.5">
                Probar {DIAS_PRUEBA} días gratis
              </Link>
              <p className="mt-2 text-center text-xs" style={{ color: "var(--muted)" }}>
                No pedimos tarjeta para la prueba.
              </p>
            </div>

            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                "Páginas y cuentas ilimitadas",
                "Facebook e Instagram",
                "Publicaciones programadas",
                "Primer comentario automático",
                "Imágenes y video",
                "Resultado y error por cada página",
                "Accesos cifrados",
                "Sin permanencia",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 font-bold" style={{ color: "var(--brand)" }}>
                    ✓
                  </span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </Seccion>

        {/* ---------------- preguntas ---------------- */}
        <Seccion eyebrow="Preguntas" titulo="Lo que suelen preguntar antes de empezar.">
          <div className="grid gap-3 lg:grid-cols-2">
            {PREGUNTAS.map((p) => (
              <details key={p.q} className="card group">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {p.q}
                    <span
                      className="mt-0.5 shrink-0 transition-transform group-open:rotate-45"
                      style={{ color: "var(--muted)" }}
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {p.a}
                </p>
              </details>
            ))}
          </div>
        </Seccion>

        {/* ---------------- cierre ---------------- */}
        <section className="border-t py-16 sm:py-24" style={{ borderColor: "var(--border)" }}>
          <div className="shell text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Deja de copiar y pegar.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base" style={{ color: "var(--muted)" }}>
              Conecta tus páginas hoy y publica en todas desde la misma pantalla.
            </p>
            <Link href="/registro" className="btn btn-primary mt-7 !px-7 !py-2.5 !text-base">
              Empezar ahora
            </Link>
          </div>
        </section>
      </main>

      {/* ---------------- pie ---------------- */}
      <footer className="border-t py-8" style={{ borderColor: "var(--border)" }}>
        <div className="shell flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "var(--muted)" }}>
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>
            Multi-Post
          </span>
          <Link href="/privacidad" className="hover:underline">
            Privacidad
          </Link>
          <Link href="/eliminar-datos" className="hover:underline">
            Eliminar mis datos
          </Link>
          <Link href="/login" className="ml-auto hover:underline">
            Entrar
          </Link>
        </div>
        <div className="shell mt-4">
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            Multi-Post no está afiliado a Meta Platforms. Facebook e Instagram son marcas de Meta
            Platforms, Inc.
          </p>
        </div>
      </footer>
    </>
  );
}
