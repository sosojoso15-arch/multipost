import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/admin";
import LogoutButton from "@/components/LogoutButton";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <>
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <nav className="shell flex items-center gap-5 py-3 sm:py-3.5">
          <Link href="/panel" className="shrink-0 text-base font-bold tracking-tight">
            Multi-Post
          </Link>
          {/* Los dos enlaces se agrupan para que no se separen al encoger. */}
          <div className="flex items-center gap-4">
            <Link href="/panel" className="text-sm hover:underline">
              Publicar
            </Link>
            <Link href="/panel/conectar" className="whitespace-nowrap text-sm hover:underline">
              Mis cuentas
            </Link>
            {/* Solo para quien administra. La reja de verdad está en la ruta
                de API; esto únicamente evita mostrar un enlace inútil. */}
            {esAdmin(user?.email) && (
              <Link href="/panel/admin" className="whitespace-nowrap text-sm hover:underline">
                Solicitudes
              </Link>
            )}
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            {/* El correo se recorta en vez de empujar al botón de salir fuera
                de la pantalla. Debajo de `sm` no sale: no cabe y no hace falta. */}
            <span
              className="hidden max-w-[28ch] truncate text-xs sm:inline"
              style={{ color: "var(--muted)" }}
              title={user?.email ?? undefined}
            >
              {user?.email}
            </span>
            <LogoutButton />
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
