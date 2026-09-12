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

/**
 * Las solicitudes, con el correo de cada quien.
 *
 * Va con service role porque el correo vive en `auth.users`, que ningun
 * cliente puede leer. Quien llama TIENE que haber comprobado antes que
 * es el dueno: esta funcion no pregunta.
 */
export async function listarSolicitudes(): Promise<Solicitud[]> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("tester_requests")
    .select("id, user_id, facebook_ref, estado, nota, avisado_at, created_at, nombre_fb, pista, correo_aviso")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const filas = (data ?? []) as (Omit<Solicitud, "correo"> & { user_id: string })[];

  return Promise.all(
    filas.map(async ({ user_id, ...f }) => {
      const { data: u } = await admin.auth.admin.getUserById(user_id);
      return { ...f, correo: u?.user?.email ?? null };
    }),
  );
}
