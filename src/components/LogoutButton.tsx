"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="btn btn-ghost !px-3 !py-1.5 text-xs"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
