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

  /* No lanza: si algo falla devuelve el motivo, y se muestra. Un 500 pelado
     —"A server error occurred"— no deja por donde empezar a buscar. */
  const r = await listarSolicitudes();
  const faltaTabla =
    !r.ok && /tester_requests|does not exist|schema cache|relation/i.test(r.error);

  return (
    <main className="shell-lectura py-8 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">Solicitudes de acceso</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Gente esperando a que la metas como Evaluador en tu app de Meta.
      </p>

      <div className="card mt-5 text-sm">
        <p className="font-semibold">Cómo se hace</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5" style={{ color: "var(--muted)" }}>
          <li>Copia el nombre de usuario de la solicitud.</li>
          <li>
            En tu app de Meta: <b>Roles de la app → Agregar personas</b>, y marca{" "}
            <b>Evaluador</b>.
            <span className="block text-xs">
              Meta lo llama <i>Evaluador</i> en español, no <i>Tester</i>. Es el que dice
              &ldquo;puede probar todos los permisos&rdquo;.
            </span>
          </li>
          <li>Pega el nombre de usuario y envía la invitación.</li>
          <li>
            Vuelve aquí y dale a <b>Ya lo invité</b>. Ahí se le avisa a esa persona.
          </li>
        </ol>

        <a href={enlaceRoles()} target="_blank" rel="noreferrer" className="btn btn-primary mt-4">
          Abrir los Roles de mi app ↗
        </a>

        <div
          className="mt-4 rounded-lg p-3 text-xs"
          style={{ background: "rgba(217,164,6,.10)", border: "1px solid rgba(217,164,6,.35)" }}
        >
          <p className="font-semibold">Si Meta dice &ldquo;does not resolve to a valid user ID&rdquo;</p>
          <p className="mt-1" style={{ color: "var(--muted)" }}>
            Son dos motivos, y ninguno es culpa tuya:
          </p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4" style={{ color: "var(--muted)" }}>
            <li>
              Esa persona <b>no se ha registrado</b> en developers.facebook.com. Facebook lo exige
              para poder meterla en un rol.
            </li>
            <li>
              Le pusiste el correo o el nombre. Esa caja solo acepta el{" "}
              <b>nombre de usuario</b> o el <b>ID numérico</b> — las cuentas sin nombre de
              usuario solo tienen número, y ese sirve igual.
            </li>
          </ol>
          <p className="mt-1.5" style={{ color: "var(--muted)" }}>
            Escríbele, que se registre, y vuelve a intentarlo. Los datos suyos ya los tienes.
          </p>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Ellos aceptan en{" "}
          <a href={ENLACE_INVITACION} target="_blank" rel="noreferrer" className="underline">
            facebook.com/settings → Desarrollador
          </a>
          — o en{" "}
          <a href="https://developers.facebook.com/settings/developer/requests/" target="_blank" rel="noreferrer" className="underline">
            developers.facebook.com/settings/developer/requests
          </a>
          , que es el que conviene pasarles: los enlaces a facebook.com se los abre la app del
          teléfono, donde no se puede aceptar.
        </p>
      </div>

      <div className="mt-6">
        {r.ok ? (
          <AdminTesters inicial={r.filas} />
        ) : (
          <div className="card" style={{ borderColor: "#e0b4b4" }}>
            <p className="font-semibold">No se pudo leer las solicitudes</p>

            {faltaTabla ? (
              <>
                <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
                  Falta correr una migración en Supabase. Son estas, en orden:
                </p>
                <pre
                  className="mt-3 overflow-x-auto rounded-lg p-3 text-xs"
                  style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                >
                  {[
                    "supabase/migrations/0006_solicitudes_tester.sql",
                    "supabase/migrations/0007_pista_y_correo.sql",
                    "supabase/migrations/0008_nombre_facebook.sql",
                  ].join("\n")}
                </pre>
                <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                  Supabase → SQL Editor → pega cada una → Run. Todas usan{" "}
                  <code>if not exists</code>, así que repetir una no rompe nada.
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
                Puede que falte el secreto <code>SUPABASE_SERVICE_ROLE_KEY</code> en el Worker.
              </p>
            )}

            <p className="mt-3 font-mono text-xs" style={{ color: "#c2352f" }}>
              {r.error}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
