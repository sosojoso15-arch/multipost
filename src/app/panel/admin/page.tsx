import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/admin";
import { ENLACE_INVITACION, enlaceRoles } from "@/lib/correo";
import AdminTesters from "@/components/AdminTesters";
import { listarSolicitudes } from "@/lib/testers";

export default async function AdminPage() {
  const user = await currentUser();

  /* La reja de verdad esta en la ruta de API, que es la que toca los datos.
     Esto solo evita mostrar una pantalla vacia a quien no le sirve. */
  if (!esAdmin(user?.email)) {
    return (
      <main className="shell-lectura py-16 text-center">
        <h1 className="text-2xl font-bold">Esta pantalla no es para ti</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Solo la ve quien administra Multi-Post.
        </p>
        <Link href="/panel" className="btn btn-primary mt-6">
          Volver al panel
        </Link>
      </main>
    );
  }

  return (
    <main className="shell-lectura py-8 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">Solicitudes de acceso</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Gente esperando a que la metas como Tester de tu app de Meta.
      </p>

      <div className="card mt-5 text-sm">
        <p className="font-semibold">Cómo se hace</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5" style={{ color: "var(--muted)" }}>
          <li>
            Copia el usuario de Facebook de la solicitud.
          </li>
          <li>
            En tu app de Meta: <b>Roles de la app → Roles → Agregar personas → Tester</b>.
          </li>
          <li>Pega el usuario y envía la invitación.</li>
          <li>
            Vuelve aquí y dale a <b>Ya lo invité</b>. Ahí se le avisa a esa persona.
          </li>
        </ol>
        <a
          href={enlaceRoles()}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary mt-4"
        >
          Abrir los Roles de mi app ↗
        </a>

        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Ellos aceptan en{" "}
          <a href={ENLACE_INVITACION} target="_blank" rel="noreferrer" className="underline">
            facebook.com/settings → Desarrollador
          </a>
          . Esa invitación no llega por correo, por eso hay que pasarles el enlace.
        </p>
      </div>

      <div className="mt-6">
        <AdminTesters inicial={await listarSolicitudes()} />
      </div>
    </main>
  );
}
