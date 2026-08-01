import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import MoisFilter from "./MoisFilter";

const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

const MOIS_LABELS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function optionsMois() {
  // Génère les 12 derniers mois (le mois en cours + 11 précédents)
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MOIS_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

export default async function DossiersPage({ searchParams }) {
  const supabase = supabaseServer();
  const moisParam = searchParams?.mois; // format "YYYY-MM"

  let query = supabase
    .from("dossiers_vente")
    .select("id, statut, client_nom, prix_negocie_ttc, marge_reelle, marge_financement_reelle, created_at, modeles ( nom ), utilisateurs ( nom )")
    .order("created_at", { ascending: false });

  if (moisParam && /^\d{4}-\d{2}$/.test(moisParam)) {
    const [annee, mois] = moisParam.split("-").map(Number);
    const debut = new Date(annee, mois - 1, 1).toISOString();
    const fin = new Date(annee, mois, 1).toISOString();
    query = query.gte("created_at", debut).lt("created_at", fin);
  } else {
    query = query.limit(100);
  }

  const { data: dossiers } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Dossiers de vente</h1>
        <Suspense fallback={null}>
          <MoisFilter options={optionsMois()} />
        </Suspense>
      </div>
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#EAE6D2] text-[11px] uppercase text-sub">
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Client</th>
              <th className="text-left px-3 py-2">Vendeur</th>
              <th className="text-left px-3 py-2">Véhicule</th>
              <th className="text-right px-3 py-2">Prix négocié</th>
              <th className="text-right px-3 py-2">Marge VDL</th>
              <th className="text-right px-3 py-2">Marge financement</th>
            </tr>
          </thead>
          <tbody>
            {(dossiers || []).map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-[#FAF8F0] cursor-pointer">
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{new Date(d.created_at).toLocaleDateString("fr-FR")}</Link></td>
                <td className="px-3 py-2">
                  <Link href={`/dossiers/${d.id}`} className="block">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${d.statut === "VENDU" ? "bg-[#EFF1E3] text-pos" : "bg-[#E7F2F2] text-accent"}`}>{d.statut}</span>
                  </Link>
                </td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.client_nom || "—"}</Link></td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.utilisateurs?.nom || "—"}</Link></td>
                <td className="px-3 py-2"><Link href={`/dossiers/${d.id}`} className="block">{d.modeles?.nom || "—"}</Link></td>
                <td className="px-3 py-2 text-right"><Link href={`/dossiers/${d.id}`} className="block">{fmt(d.prix_negocie_ttc)}</Link></td>
                <td className={`px-3 py-2 text-right font-bold ${d.marge_reelle >= 0 ? "text-pos" : "text-neg"}`}>
                  <Link href={`/dossiers/${d.id}`} className="block">{fmt((d.marge_reelle || 0) - (d.marge_financement_reelle || 0))}</Link>
                </td>
                <td className="px-3 py-2 text-right font-bold text-pos">
                  <Link href={`/dossiers/${d.id}`} className="block">{d.marge_financement_reelle ? fmt(d.marge_financement_reelle) : "—"}</Link>
                </td>
              </tr>
            ))}
            {(!dossiers || dossiers.length === 0) && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sub">Aucun dossier pour cette période.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
