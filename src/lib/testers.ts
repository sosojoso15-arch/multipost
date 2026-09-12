import { supabaseAdmin } from "@/lib/supabase/admin";

export type Solicitud = {
  id: string;
  facebook_ref: string;
  estado: "pendiente" | "listo" | "rechazado";
  nota: string | null;
  avisado_at: string | null;
  created_at: string;
  nombre_fb: string | null;
  pista: string | null;
  correo_aviso: string | null;
  /** El correo de su cuenta. A donde se avisa es `correo_aviso ?? correo`. */
  correo: string | null;
};

/** Sale bien con las filas, o mal con el motivo. Nunca lanza. */
export type Resultado =
  | { ok: true; filas: Solicitud[] }
  | { ok: false; error: string };

/**
 * Las solicitudes, con el correo de cada quien.
 *
 * Va con service role porque el correo vive en `auth.users`, que ningun
 * cliente puede leer. Quien llama TIENE que haber comprobado antes que
 * es el dueno: esta funcion no pregunta.
 *
 * No lanza a proposito: se llama desde un componente de servidor, y ahi
 * una excepcion se convierte en un 500 pelado que no dice nada. Mejor
 * devolver el motivo y que la pantalla lo muestre.
 */
export async function listarSolicitudes(): Promise<Resultado> {
  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sin cliente admin" };
  }

  const { data, error } = await admin
    .from("tester_requests")
    .select("id, user_id, facebook_ref, estado, nota, avisado_at, created_at, nombre_fb, pista, correo_aviso")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const crudas = (data ?? []) as (Omit<Solicitud, "correo"> & { user_id: string })[];

  const filas = await Promise.all(
    crudas.map(async ({ user_id, ...f }) => {
      const { data: u } = await admin.auth.admin.getUserById(user_id);
      return { ...f, correo: u?.user?.email ?? null };
    }),
  );

  return { ok: true, filas };
}
