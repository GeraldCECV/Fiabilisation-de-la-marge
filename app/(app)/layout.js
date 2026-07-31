import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import SignOutButton from "./SignOutButton";

export default async function AppLayout({ children }) {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("nom, role")
    .eq("id", session.user.id)
    .single();

  return (
    <div>
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/images/logo-ypocamp.png" alt="Ypocamp" className="h-10 w-auto" />
            <span className="font-extrabold text-sm text-sub">Trame de rentabilité VN</span>
            <nav className="flex gap-4 text-sm text-sub">
              <Link href="/tableau-de-bord" className="hover:text-ink">Tableau de bord</Link>
              <Link href="/calculateur" className="hover:text-ink">Calculateur</Link>
              <Link href="/dossiers" className="hover:text-ink">Dossiers</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-sub">{profil?.nom || session.user.email}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF1E3] text-pos font-bold">
              {profil?.role || "COMMERCIAL"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
