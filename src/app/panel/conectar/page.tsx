import { supabaseServer, currentUser } from "@/lib/supabase/server";
import ConnectWizard from "@/components/ConnectWizard";
import { redirectUri } from "@/lib/metaOauth";
import PedirAcceso from "@/components/PedirAcceso";

export default async function ConectarPage() {
  const user = await currentUser();
  const sb = await supabaseServer();

  const { data: app } = await sb
    .from("meta_apps")
    .select("app_id, graph_ver, app_secret_enc, config_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: solicitud } = await sb
    .from("tester_requests")
    .select("facebook_ref, estado, nota, pista, correo_aviso")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: cuentas } = await sb
    .from("accounts")
    .select("id, platform, name, picture_url, last_error")
    .eq("user_id", user!.id)
    .order("platform")
    .order("name");

  return (
    <main className="shell-lectura py-10">
      <h1 className="text-2xl font-bold">Mis cuentas</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Hay dos caminos. El corto es que nosotros te conectemos.
      </p>

      {cuentas && cuentas.length > 0 && (
        <div className="card mt-6">
          <p className="font-semibold">Conectadas ({cuentas.length})</p>
          <ul className="mt-3 space-y-2">
            {cuentas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.picture_url ?? ""}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                  style={{ background: "var(--background)" }}
                />
                <span className="flex-1 truncate">{c.name}</span>
                {c.last_error ? (
                  <span className="text-xs text-red-600">reconectar</span>
                ) : (
                  <span
                    className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                    style={{ background: "var(--background)", color: "var(--muted)" }}
                  >
                    {c.platform === "instagram" ? "IG" : "FB"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
            ¿Creaste una página nueva? Repite el paso 5 para traerla.
          </p>
        </div>
      )}

      {/* El camino corto va PRIMERO y el largo queda plegado debajo: si los
          dos se ven igual de grandes, la gente empieza por el de arriba y la
          mitad se pierde creando una app que no necesita. */}
      <div className="mt-6">
        <PedirAcceso
          estado={(solicitud?.estado as "pendiente" | "listo" | "rechazado") ?? "ninguna"}
          refGuardada={solicitud?.facebook_ref ?? null}
          pistaGuardada={solicitud?.pista ?? null}
          correoGuardado={solicitud?.correo_aviso ?? null}
          nota={solicitud?.nota ?? null}
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">
          O hazlo tú con tu propia app de Meta
          <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
            — cinco pasos, unos tres minutos
          </span>
        </summary>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Con esto no dependes de que te demos acceso, y los permisos quedan a tu nombre.
        </p>
        <div className="mt-4">
        <ConnectWizard
          redirectUri={redirectUri()}
          appGuardada={
            app
              ? {
                  app_id: app.app_id,
                  graph_ver: app.graph_ver,
                  config_id: app.config_id ?? "",
                  tiene_secret: Boolean(app.app_secret_enc),
                }
              : null
          }
        />
        </div>
      </details>
    </main>
  );
}
