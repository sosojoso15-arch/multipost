import { secreto } from "@/lib/env";

/**
 * Quien manda.
 *
 * Va por variable de entorno y no por una columna en la base a proposito:
 * una columna `es_admin` se puede cambiar con la llave de servicio, y si
 * algun dia se filtra, alguien se hace admin solo. Una variable del Worker
 * solo la cambia quien tenga la cuenta de Cloudflare.
 *
 * ADMIN_EMAILS son correos separados por coma.
 */
export function esAdmin(correo: string | null | undefined): boolean {
  if (!correo) return false;

  const lista = secreto("ADMIN_EMAILS");
  if (!lista) return false;

  const normal = correo.trim().toLowerCase();
  return lista
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .includes(normal);
}
