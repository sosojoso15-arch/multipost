import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <>
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <nav className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/panel" className="font-bold">
            Multi-Post
          </Link>
          <Link href="/panel" className="text-sm hover:underline">
            Publicar
          </Link>
          <Link href="/panel/conectar" className="text-sm hover:underline">
            Mis cuentas
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs sm:inline" style={{ color: "var(--muted)" }}>
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
