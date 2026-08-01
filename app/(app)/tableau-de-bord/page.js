import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import DashboardOperationFilter from "./DashboardOperationFilter";

function fmt(n) {
  return (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default async function DashboardPage({ searchParams }) {
  const supabase = supabaseServer();
  const operationParam = searchParams?.operation;

  const { data: operations } = await supabase.from("operations_commerciales").select("id, nom").order("nom");

  let query = supabase.from("dossiers_vente").select("statut, marge_reelle, operation_id");
  if (operationParam) {
    query = query.eq("operation_id", operationParam);
  }
  const { data: dossiers } = await query;

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

  const operationSelectionnee = operations?.find((o) => o.id === operationParam);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold">Tableau de bord</h1>
        <Suspense fallback={null}>
          <DashboardOperationFilter operations={operations || []} />
        </Suspense>
      </div>
      <p className="text-sub text-sm mb-6">
        {operationSelectionnee ? `Activité VN — opération "${operationSelectionnee.nom}"` : "Vue d'ensemble de l'activité VN (toutes opérations confondues)."}
      </p>
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
