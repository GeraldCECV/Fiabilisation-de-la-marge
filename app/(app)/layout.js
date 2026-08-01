import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import SignOutButton from "./SignOutButton";
import SidebarNav from "./SidebarNav";

export default async function AppLayout({ children }) {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("nom, role")
    .eq("id", session.user.id)
    .single();

  const liens = [
    { href: "/calculateur", label: "Calculateur" },
    { href: "/tableau-de-bord", label: "Tableau de bord" },
    { href: "/dossiers", label: "Dossiers" },
    { href: "/operations", label: "Opérations" },
  ];
  if (profil?.role === "RESPONSABLE") {
    liens.push({ href: "/admin/utilisateurs", label: "Administration" });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col min-h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center">
            <img src="/images/logo-ypocamp.png" alt="Ypocamp" className="h-10 w-auto" />
          </Link>
          <div className="font-extrabold text-sm text-sub mt-2">Trame de rentabilité VN</div>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <SidebarNav liens={liens} />
        </div>

        <div className="px-4 py-4 border-t border-border">
          <div className="text-sm text-ink font-semibold truncate">{profil?.nom || session.user.email}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E0F3F0] text-pos font-bold">
              {profil?.role || "COMMERCIAL"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
