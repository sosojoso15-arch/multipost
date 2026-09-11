import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad — Multi-Post",
  description:
    "Qué datos guarda Multi-Post, para qué los usa, cuánto los conserva y cómo pedir que se borren.",
};

const ACTUALIZADO = "11 de septiembre de 2026";
const CONTACTO = "suarezsotoandres7@gmail.com";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-sm font-semibold underline" style={{ color: "var(--brand)" }}>
        ← Multi-Post
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Última actualización: {ACTUALIZADO}
      </p>

      <div className="card mt-6 text-sm">
        <p className="font-semibold">En corto</p>
        <p className="mt-1.5" style={{ color: "var(--muted)" }}>
          Multi-Post publica en las páginas de Facebook e Instagram que tú conectas. Guardamos lo
          mínimo para poder hacerlo: tu correo, los datos de tu app de Meta y los accesos de tus
          páginas, siempre cifrados. No vendemos nada ni mostramos publicidad.
        </p>
      </div>

      <Seccion titulo="Quién es responsable">
        <p>
          Multi-Post es un servicio operado de forma independiente. Para cualquier asunto sobre tus
          datos, escribe a <b style={{ color: "var(--foreground)" }}>{CONTACTO}</b>.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos guardamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b style={{ color: "var(--foreground)" }}>Tu cuenta.</b> Correo electrónico y contraseña
            cifrada. La contraseña la administra Supabase; nosotros nunca la vemos.
          </li>
          <li>
            <b style={{ color: "var(--foreground)" }}>Tu app de Meta.</b> El App ID, el Configuration
            ID y el App Secret. El secreto se guarda cifrado con AES-256-GCM y nunca se vuelve a
            mostrar en pantalla.
          </li>
          <li>
            <b style={{ color: "var(--foreground)" }}>Tus páginas y cuentas.</b> Nombre, foto,
            identificador dentro de Meta y el token de acceso de cada una. Los tokens también van
            cifrados.
          </li>
          <li>
            <b style={{ color: "var(--foreground)" }}>Tus publicaciones.</b> El texto, los enlaces,
            las URL de las imágenes o videos, la fecha programada y el resultado de cada envío
            (correcto, o el error exacto que devolvió Meta).
          </li>
        </ul>
        <p>
          No pedimos ni guardamos tu contraseña de Facebook. El permiso se otorga dentro de Meta y
          nosotros solo recibimos un token.
        </p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <p>
          Únicamente para prestar el servicio: mostrarte tus páginas, publicar lo que tú pides,
          ejecutar tus publicaciones programadas y enseñarte qué falló cuando algo falla.
        </p>
        <p>
          No usamos tus datos para entrenar modelos, no los vendemos, no los cedemos a terceros con
          fines comerciales y no te mandamos publicidad.
        </p>
      </Seccion>

      <Seccion titulo="Con quién se comparten">
        <p>Solo con la infraestructura necesaria para que el servicio funcione:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b style={{ color: "var(--foreground)" }}>Meta</b> — recibe las publicaciones que tú
            ordenas enviar, porque es el destino.
          </li>
          <li>
            <b style={{ color: "var(--foreground)" }}>Supabase</b> — guarda la base de datos y las
            cuentas.
          </li>
          <li>
            <b style={{ color: "var(--foreground)" }}>Cloudflare</b> — sirve la aplicación.
          </li>
        </ul>
        <p>
          También los entregaríamos si una autoridad competente lo exigiera por ley. Nada más.
        </p>
      </Seccion>

      <Seccion titulo="Cómo los protegemos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Los tokens y el App Secret se cifran antes de guardarse.</li>
          <li>
            La base aplica <i>Row Level Security</i>: cada cuenta solo puede leer sus propias filas,
            a nivel del motor de base de datos.
          </li>
          <li>Todo el tráfico va por HTTPS.</li>
        </ul>
        <p>
          Ningún sistema es infalible. Si ocurriera una brecha que afecte tus datos, te avisaríamos
          al correo de tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los conservamos">
        <p>
          Mientras tengas la cuenta abierta. Si la borras, eliminamos tus datos en un plazo máximo
          de 30 días, salvo lo que la ley obligue a conservar.
        </p>
        <p>
          Puedes desconectar una página cuando quieras, y también quitarle el permiso a la
          aplicación desde la configuración de tu cuenta de Facebook.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Puedes pedir ver, corregir, exportar o borrar tus datos escribiendo a{" "}
          <b style={{ color: "var(--foreground)" }}>{CONTACTO}</b>. Respondemos en un plazo máximo
          de 30 días.
        </p>
        <p>
          Para borrar todo, hay instrucciones paso a paso en{" "}
          <Link href="/eliminar-datos" className="font-semibold underline">
            eliminación de datos
          </Link>
          .
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>
          El servicio está pensado para negocios y no se dirige a menores de 18 años. No recogemos
          datos de menores a sabiendas.
        </p>
      </Seccion>

      <Seccion titulo="Cambios">
        <p>
          Si cambiamos algo importante, actualizamos la fecha de arriba y te avisamos al correo de
          tu cuenta antes de que entre en vigor.
        </p>
      </Seccion>

      <p className="mt-10 text-xs" style={{ color: "var(--muted)" }}>
        ¿Dudas? Escribe a {CONTACTO}.
      </p>
    </main>
  );
}
