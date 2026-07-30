import { supabaseServer } from "@/lib/supabaseServer";

function fmt(n) {
  return (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: dossiers } = await supabase.from("dossiers_vente").select("statut, marge_reelle, created_at");

  const nbPropositions = dossiers?.length || 0;
  const vendus = (dossiers || []).filter((d) => d.statut === "VENDU");
  const margeTotale = vendus.reduce((s, d) => s + Number(d.marge_reelle || 0), 0);
  const margeMoyenne = vendus.length ? margeTotale / vendus.length : 0;

  const cards = [
    ["Dossiers ouverts", nbPropositions],
    ["Ventes réalisées", vendus.length],
    ["Marge cumulée", fmt(margeTotale)],
    ["Marge moyenne / vente", fmt(margeMoyenne)],
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Tableau de bord</h1>
      <p className="text-sub text-sm mb-6">Vue d'ensemble de l'activité VN.</p>
      <div className="grid grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[11px] text-sub uppercase tracking-wide">{label}</div>
            <div className="text-xl font-extrabold mt-1">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
