import { supabaseServer } from "@/lib/supabaseServer";

function fmt(n) {
  return (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: dossiers } = await supabase
    .from("dossiers_vente")
    .select("statut, marge_reelle, marge_financement_reelle, created_at")
    .order("created_at", { ascending: false });

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

  // Regroupement par jour (30 derniers jours avec activité)
  const parJour = {};
  for (const d of dossiers || []) {
    const jour = new Date(d.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
    if (!parJour[jour]) parJour[jour] = { nbDossiers: 0, nbVendus: 0, margeTotale: 0, margeFinancement: 0 };
    parJour[jour].nbDossiers += 1;
    if (d.statut === "VENDU") {
      parJour[jour].nbVendus += 1;
      parJour[jour].margeTotale += Number(d.marge_reelle || 0);
      parJour[jour].margeFinancement += Number(d.marge_financement_reelle || 0);
    }
  }
  const joursTries = Object.keys(parJour).sort((a, b) => (a < b ? 1 : -1)).slice(0, 30);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Tableau de bord</h1>
      <p className="text-sub text-sm mb-6">Vue d'ensemble de l'activité VN.</p>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[11px] text-sub uppercase tracking-wide">{label}</div>
            <div className="text-xl font-extrabold mt-1">{value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-extrabold mb-3">Dossiers par jour</h2>
      {joursTries.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-6 text-sm text-sub">Aucun dossier pour le moment.</div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F1EFE6]">
                <th className="text-left px-3 py-2 text-[11px] uppercase text-sub font-bold">Date</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase text-sub font-bold">Dossiers créés</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase text-sub font-bold">Ventes</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase text-sub font-bold">Marge VDL</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase text-sub font-bold">Marge financement</th>
              </tr>
            </thead>
            <tbody>
              {joursTries.map((jour) => {
                const v = parJour[jour];
                const margeVdl = v.margeTotale - v.margeFinancement;
                const dateAffichee = new Date(jour + "T00:00:00").toLocaleDateString("fr-FR", {
                  weekday: "short", day: "2-digit", month: "short",
                });
                return (
                  <tr key={jour} className="border-t border-border">
                    <td className="px-3 py-2 capitalize">{dateAffichee}</td>
                    <td className="px-3 py-2 text-right">{v.nbDossiers}</td>
                    <td className="px-3 py-2 text-right">{v.nbVendus}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: margeVdl >= 0 ? "#3F6B4F" : "#A6423B" }}>
                      {v.nbVendus > 0 ? fmt(margeVdl) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: "#3F6B4F" }}>
                      {v.nbVendus > 0 ? fmt(v.margeFinancement) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
