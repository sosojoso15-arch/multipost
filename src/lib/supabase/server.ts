import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de Supabase para Server Components, Route Handlers y Server Actions. */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el middleware ya refresca la sesion.
          }
        },
      },
    },
  );
}

/** Usuario actual, o null. */
export async function currentUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
