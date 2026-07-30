import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

export default async function DossiersPage() {
  const supabase = supabaseServer();
  const { data: dossiers } = await supabase
    .from("dossiers_vente")
    .select("id, statut, client_nom, prix_negocie_ttc, marge_reelle, created_at, modeles ( nom ), utilisateurs ( nom )")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Dossiers de vente</h1>
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1EFE6] text-[11px] uppercase text-sub">
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Client</th>
              <th className="text-left px-3 py-2">Vendeur</th>
              <th className="text-left px-3 py-2">Véhicule</th>
              <th className="text-right px-3 py-2">Prix négocié</th>
              <th className="text-right px-3 py-2">Marge réelle</th>
            </tr>
          </thead>
          <tbody>
            {(dossiers || []).map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-[#FCFBF8] cursor-pointer">
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{new Date(d.created_at).toLocaleDateString("fr-FR")}</Link></td>
                <td className="px-3 py-2">
                  <Link href={`/dossiers/${d.id}`} className="block">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${d.statut === "VENDU" ? "bg-[#E4EEE6] text-pos" : "bg-[#EFEBE0] text-accent"}`}>{d.statut}</span>
                  </Link>
                </td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.client_nom || "—"}</Link></td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.utilisateurs?.nom || "—"}</Link></td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.modeles?.nom || "—"}</Link></td>
                <td className="px-3 py-2 text-right"><Link href={`/dossiers/${d.id}`} className="block">{fmt(d.prix_negocie_ttc)}</Link></td>
                <td className={`px-3 py-2 text-right font-bold ${d.marge_reelle >= 0 ? "text-pos" : "text-neg"}`}><Link href={`/dossiers/${d.id}`} className="block">{fmt(d.marge_reelle)}</Link></td>
              </tr>
            ))}
            {(!dossiers || dossiers.length === 0) && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sub">Aucun dossier pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
