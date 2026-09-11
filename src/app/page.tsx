import Link from "next/link";

const ventajas = [
  {
    t: "Todas tus páginas de un golpe",
    d: "Escribes una vez y sale publicado en cada página de Facebook y cada cuenta de Instagram que elijas.",
  },
  {
    t: "Tus tokens son tuyos",
    d: "Usas tu propia app de Meta. Nosotros guardamos los accesos cifrados y nadie más los ve.",
  },
  {
    t: "Programa y olvídate",
    d: "Deja el post listo para la hora que quieras. Se publica solo, aunque tengas el computador apagado.",
  },
  {
    t: "Sabes qué falló y por qué",
    d: "Si una página rechaza el post, las demás siguen y te decimos el error exacto de esa página.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16">
      <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
        Multi-Post
      </p>
      <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
        Publica en todas tus páginas
        <br />
        al mismo tiempo.
      </h1>
      <p className="mt-4 max-w-xl text-base" style={{ color: "var(--muted)" }}>
        Un solo mensaje, todas tus páginas de Facebook y cuentas de Instagram. Sin copiar y pegar
        veinte veces.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/registro" className="btn btn-primary">
          Crear cuenta gratis
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Ya tengo cuenta
        </Link>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        Plan gratis: 30 publicaciones al mes. Sin tarjeta.
      </p>

      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {ventajas.map((v) => (
          <div key={v.t} className="card">
            <h2 className="font-semibold">{v.t}</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
              {v.d}
            </p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">¿Y por qué tengo que crear mi propia app de Meta?</h2>
        <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
          Porque así tú eres el dueño del permiso. Es una configuración de una sola vez, te llevamos
          de la mano paso por paso, y toma unos 5 minutos. A cambio, tu cuenta no depende de que Meta
          apruebe a un tercero, y tus accesos nunca salen de tu control.
        </p>
      </div>
    </main>
  );
}
