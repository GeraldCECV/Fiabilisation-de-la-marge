"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sub hover:text-neg text-xs font-semibold"
    >
      Déconnexion
    </button>
  );
}
