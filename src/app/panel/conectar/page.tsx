import { supabaseServer, currentUser } from "@/lib/supabase/server";
import ConnectWizard from "@/components/ConnectWizard";
import { redirectUri } from "@/lib/metaOauth";

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
        Cinco pasos cortos, una sola vez. Después solo publicas.
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

      <div className="mt-6">
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
    </main>
  );
}
