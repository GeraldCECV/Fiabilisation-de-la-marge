import { supabaseServer } from "@/lib/supabaseServer";
import OperationForm from "./OperationForm";
import OperationToggle from "./OperationToggle";

const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default async function OperationsPage() {
  const supabase = supabaseServer();

  const { data: operations } = await supabase
    .from("operations_commerciales")
    .select("*")
    .order("date_debut", { ascending: false });

  const { data: dossiers } = await supabase
    .from("dossiers_vente")
    .select("operation_id, statut, marge_reelle");

  const statsParOperation = {};
  for (const d of dossiers || []) {
    if (!d.operation_id) continue;
    if (!statsParOperation[d.operation_id]) statsParOperation[d.operation_id] = { nbDossiers: 0, nbVendus: 0, marge: 0 };
    statsParOperation[d.operation_id].nbDossiers += 1;
    if (d.statut === "VENDU") {
      statsParOperation[d.operation_id].nbVendus += 1;
      statsParOperation[d.operation_id].marge += Number(d.marge_reelle || 0);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold mb-1">Opérations commerciales</h1>
          <p className="text-sub text-sm">Salons, portes ouvertes, promotions saisonnières...</p>
        </div>
        <OperationForm />
      </div>

      {(!operations || operations.length === 0) ? (
        <div className="bg-surface border border-border rounded-lg p-6 text-sm text-sub">Aucune opération créée pour le moment.</div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EAE6D2] text-[11px] uppercase text-sub">
                <th className="text-left px-3 py-2">Opération</th>
                <th className="text-left px-3 py-2">Période</th>
                <th className="text-right px-3 py-2">Propositions</th>
                <th className="text-right px-3 py-2">Ventes</th>
                <th className="text-right px-3 py-2">Marge cumulée</th>
                <th className="text-right px-3 py-2">Marge moyenne / vente</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => {
                const s = statsParOperation[op.id] || { nbDossiers: 0, nbVendus: 0, marge: 0 };
                const margeMoyenne = s.nbVendus ? s.marge / s.nbVendus : 0;
                return (
                  <tr key={op.id} className="border-t border-border">
                    <td className="px-3 py-2 font-bold">{op.nom}</td>
                    <td className="px-3 py-2 text-sub">{fmtDate(op.date_debut)} — {fmtDate(op.date_fin)}</td>
                    <td className="px-3 py-2 text-right">{s.nbDossiers}</td>
                    <td className="px-3 py-2 text-right">{s.nbVendus}</td>
                    <td className="px-3 py-2 text-right font-bold text-pos">{s.nbVendus > 0 ? fmt(s.marge) : "—"}</td>
                    <td className="px-3 py-2 text-right">{s.nbVendus > 0 ? fmt(margeMoyenne) : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${op.actif ? "bg-[#EFF1E3] text-pos" : "bg-[#F1EEDC] text-sub"}`}>
                        {op.actif ? "Active" : "Archivée"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right"><OperationToggle id={op.id} actif={op.actif} /></td>
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
