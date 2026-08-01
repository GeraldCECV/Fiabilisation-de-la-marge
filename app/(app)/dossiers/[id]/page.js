import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import PrintButton from "./PrintButton";
import DossierActions from "./DossierActions";

const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtPct = (n) => (Number.isFinite(n) ? (Number(n) * 100).toFixed(1) : "0") + " %";
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const STOCK_LABELS = { STOCK: "En stock", REASSORT: "Réassort", COMMANDE: "Commande usine" };

export default async function DossierDetailPage({ params }) {
  const supabase = supabaseServer();

  const { data: dossier } = await supabase
    .from("dossiers_vente")
    .select("*, modeles ( nom, gamme, type, prix_usine_ht, prix_public_ttc, marques ( nom ) ), utilisateurs ( nom )")
    .eq("id", params.id)
    .single();

  if (!dossier) notFound();

  let options = [];
  if (dossier.options_choisies?.length) {
    const { data } = await supabase.from("options").select("id, designation, prix_ttc, achat_ht").in("id", dossier.options_choisies);
    options = data || [];
  }

  const totalOptionsTtc = options.reduce((s, o) => s + Number(o.prix_ttc || 0), 0);
  const carteGrise = dossier.modeles?.type === "CAMPING_CAR" ? 790 : 380;
  const prixAvecOptions = (Number(dossier.modeles?.prix_public_ttc) || 0) + totalOptionsTtc + carteGrise;
  const remise = prixAvecOptions - Number(dossier.prix_negocie_ttc || 0);

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <Link href="/dossiers" className="text-sub text-sm hover:text-ink">&larr; Retour aux dossiers</Link>
        <div className="flex gap-3 items-center">
          <DossierActions dossierId={params.id} statut={dossier.statut} />
          <Link href={`/dossiers/${params.id}/edit`} className="px-4 py-2 rounded-md border border-border bg-white font-bold text-sm">Modifier</Link>
          <a href={`/api/export-fiche/${params.id}`} className="px-4 py-2 rounded-md border border-border bg-white font-bold text-sm">Exporter en Excel</a>
          <PrintButton />
        </div>
      </div>

      <div id="fiche" className="bg-surface border border-border rounded-lg p-10 max-w-3xl mx-auto print:border-0 print:shadow-none print:p-0">
        <div className="flex items-start justify-between border-b border-border pb-5 mb-6">
          <div>
            <div className="text-[11px] tracking-widest text-accent font-bold uppercase">Fiche de rentabilité — Véhicule Neuf</div>
            <div className="text-2xl font-extrabold mt-1">{dossier.modeles?.marques?.nom} {dossier.modeles?.nom}</div>
            <div className="text-sm text-sub mt-1">{dossier.modeles?.gamme} — {STOCK_LABELS[dossier.stock_statut] || dossier.stock_statut}{dossier.numero_chassis && ` — N° ${dossier.numero_chassis}`}</div>
          </div>
          <div className="text-right text-sm">
            <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${dossier.statut === "VENDU" ? "bg-[#E0F3F0] text-pos" : "bg-[#E7F2F2] text-accent"}`}>{dossier.statut}</span>
            <div className="text-sub mt-2">{fmtDate(dossier.created_at)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div><div className="text-[11px] text-sub uppercase font-bold mb-1">Client</div><div>{dossier.client_nom || "—"}</div></div>
          <div><div className="text-[11px] text-sub uppercase font-bold mb-1">Vendeur</div><div>{dossier.utilisateurs?.nom || "—"}</div></div>
        </div>

        <div className="mb-6">
          <div className="text-[11px] text-sub uppercase font-bold mb-2">Véhicule &amp; frais annexes</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-border"><td className="py-1.5 text-sub">Prix public catalogue TTC</td><td className="py-1.5 text-right">{fmt(dossier.modeles?.prix_public_ttc)}</td></tr>
              <tr className="border-t border-border"><td className="py-1.5 text-sub">Prix usine HT</td><td className="py-1.5 text-right">{fmt(dossier.modeles?.prix_usine_ht)}</td></tr>
              {dossier.frais_sortie_usine > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Frais sortie usine</td><td className="py-1.5 text-right">{fmt(dossier.frais_sortie_usine)}</td></tr>}
              {dossier.transport_usine > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Transport usine</td><td className="py-1.5 text-right">{fmt(dossier.transport_usine)}</td></tr>}
              {dossier.cession_odoo > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Cession Odoo / travaux ext.</td><td className="py-1.5 text-right">{fmt(dossier.cession_odoo)}</td></tr>}
              {dossier.transport_intersite > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Transport inter-site</td><td className="py-1.5 text-right">{fmt(dossier.transport_intersite)}</td></tr>}
              {dossier.batterie_choix && <tr className="border-t border-border"><td className="py-1.5 text-sub">Batterie</td><td className="py-1.5 text-right">{dossier.batterie_choix}</td></tr>}
            </tbody>
          </table>
        </div>

        {options.length > 0 && (
          <div className="mb-6">
            <div className="text-[11px] text-sub uppercase font-bold mb-2">Options usine ({options.length})</div>
            <table className="w-full text-sm">
              <tbody>
                {options.map((o) => (
                  <tr key={o.id} className="border-t border-border"><td className="py-1.5">{o.designation}</td><td className="py-1.5 text-right">{fmt(o.prix_ttc)}</td></tr>
                ))}
                <tr className="border-t border-border font-bold"><td className="py-1.5">Total options TTC</td><td className="py-1.5 text-right">{fmt(totalOptionsTtc)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-6">
          <div className="text-[11px] text-sub uppercase font-bold mb-2">Négociation</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-border"><td className="py-1.5 text-sub">Prix avec options + carte grise</td><td className="py-1.5 text-right">{fmt(prixAvecOptions)}</td></tr>
              <tr className="border-t border-border"><td className="py-1.5 text-sub">Prix négocié TTC (hors carte grise)</td><td className="py-1.5 text-right font-bold">{fmt(dossier.prix_negocie_ttc)}</td></tr>
              <tr className="border-t border-border"><td className="py-1.5 text-sub">Remise accordée</td><td className="py-1.5 text-right">{fmt(remise)} {dossier.remise_pct != null && `(${fmtPct(dossier.remise_pct)})`}</td></tr>
              {dossier.prix_affiche_parc > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Prix affiché sur parc</td><td className="py-1.5 text-right">{fmt(dossier.prix_affiche_parc)}</td></tr>}
              {dossier.financement_montant > 0 && <tr className="border-t border-border"><td className="py-1.5 text-sub">Financement ({dossier.financement_organisme || "à préciser"})</td><td className="py-1.5 text-right">{fmt(dossier.financement_montant)}</td></tr>}
              {dossier.rachat_actif && <tr className="border-t border-border"><td className="py-1.5 text-sub">Rachat véhicule client</td><td className="py-1.5 text-right">{fmt(dossier.rachat_montant)}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-ink text-white rounded-lg p-5 print:bg-white print:text-ink print:border print:border-ink">
          <div className="text-[11px] uppercase font-bold text-[#A9C7C8] print:text-sub">Marge de l'affaire</div>
          <div className="flex gap-10 mt-2">
            <div><div className="text-[11px] text-[#A9C7C8] print:text-sub">Attendue (barème)</div><div className="text-xl font-extrabold">{fmt(dossier.marge_attendue)}</div></div>
            <div><div className="text-[11px] text-[#A9C7C8] print:text-sub">Réelle</div><div className="text-xl font-extrabold">{fmt(dossier.marge_reelle)}</div></div>
            <div><div className="text-[11px] text-[#A9C7C8] print:text-sub">Taux réel</div><div className="text-xl font-extrabold">{dossier.taux_marge_reel != null ? fmtPct(dossier.taux_marge_reel) : "—"}</div></div>
            <div><div className="text-[11px] text-[#A9C7C8] print:text-sub">Commission vendeur</div><div className="text-xl font-extrabold">{fmt(dossier.commission_vendeur)}</div></div>
          </div>
        </div>

        {dossier.commentaires && (
          <div className="mt-6">
            <div className="text-[11px] text-sub uppercase font-bold mb-2">Bon de préparation / commentaires</div>
            <div className="text-sm bg-[#F0FFFE] border border-border rounded-md p-3 whitespace-pre-wrap">{dossier.commentaires}</div>
          </div>
        )}

        <div className="text-[11px] text-sub mt-6 pt-4 border-t border-border">
          Document généré le {fmtDate(new Date())} — Trame de rentabilité VN — usage interne uniquement.
        </div>
      </div>
    </div>
  );
}
