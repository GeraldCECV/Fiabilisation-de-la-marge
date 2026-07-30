"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { calculerMarge } from "@/lib/margeEngine";

const ANNEE_COURANTE = 2027;
const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtPct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) : "0") + " %";

export default function CalculateurPage() {
  const supabase = supabaseBrowser();

  const [marques, setMarques] = useState([]);
  const [marqueId, setMarqueId] = useState(null);
  const [modeles, setModeles] = useState([]);
  const [modeleId, setModeleId] = useState(null);
  const [options, setOptions] = useState([]); // options compatibles avec le modèle sélectionné + statut
  const [optionsChoisiesIds, setOptionsChoisiesIds] = useState([]);
  const [baremes, setBaremes] = useState([]);
  const [forfaits, setForfaits] = useState([]);
  const [prixNegocie, setPrixNegocie] = useState(0);
  const [financementActif, setFinancementActif] = useState(false);
  const [financementMontant, setFinancementMontant] = useState(0);
  const [client, setClient] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Chargement initial : marques, barèmes, forfaits
  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: b }, { data: f }] = await Promise.all([
        supabase.from("marques").select("id, nom").order("nom"),
        supabase.from("baremes_marge").select("*"),
        supabase.from("forfaits_fixes").select("*"),
      ]);
      setMarques(m || []);
      setBaremes(b || []);
      setForfaits(f || []);
      if (m && m.length) setMarqueId(m[0].id);
      setLoading(false);
    })();
  }, []);

  // Modèles de la marque sélectionnée
  useEffect(() => {
    if (!marqueId) return;
    (async () => {
      const { data } = await supabase
        .from("modeles")
        .select("*")
        .eq("marque_id", marqueId)
        .eq("actif", true)
        .order("gamme")
        .order("nom");
      setModeles(data || []);
      if (data && data.length) setModeleId(data[0].id);
    })();
  }, [marqueId]);

  // Options compatibles avec le modèle sélectionné
  useEffect(() => {
    if (!modeleId) return;
    (async () => {
      const { data } = await supabase
        .from("compatibilites")
        .select("statut, options ( id, designation, achat_ht, cession_pose, prix_ttc, poids_kg )")
        .eq("modele_id", modeleId);
      const liste = (data || [])
        .filter((row) => row.options)
        .map((row) => ({ ...row.options, statut: row.statut }));
      setOptions(liste);
      setOptionsChoisiesIds([]);
      const modele = modeles.find((mo) => mo.id === modeleId);
      if (modele) setPrixNegocie(modele.prix_public_ttc);
    })();
  }, [modeleId]);

  const modele = modeles.find((m) => m.id === modeleId);
  const optionsSelectionnables = options.filter((o) => o.statut === "OPTION");
  const optionsDeSerie = options.filter((o) => o.statut === "SERIE");
  const optionsChoisies = optionsSelectionnables.filter((o) => optionsChoisiesIds.includes(o.id));

  const calc = useMemo(() => {
    if (!modele) return null;
    return calculerMarge({
      modele,
      optionsChoisies,
      baremes,
      forfaits,
      prixNegocieTtc: Number(prixNegocie) || 0,
      financement: { actif: financementActif, montant: Number(financementMontant) || 0 },
      anneeCourante: ANNEE_COURANTE,
    });
  }, [modele, optionsChoisies, baremes, forfaits, prixNegocie, financementActif, financementMontant]);

  async function enregistrer(statut) {
    if (!modele || !calc) return;
    setMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      statut,
      client_nom: client,
      vendeur_id: session.user.id,
      modele_id: modele.id,
      options_choisies: optionsChoisiesIds,
      prix_negocie_ttc: Number(prixNegocie) || 0,
      financement_organisme: financementActif ? "À préciser" : null,
      financement_montant: financementActif ? Number(financementMontant) || 0 : 0,
      marge_attendue: calc.E29,
      marge_reelle: calc.E33,
      commission_vendeur: calc.commission,
      verrouille: statut === "VENDU",
    };
    const { data, error } = await supabase.from("dossiers_vente").insert(payload).select().single();
    if (error) {
      setMsg("Erreur d'enregistrement : " + error.message);
      return;
    }
    await supabase.from("historique_dossier").insert({
      dossier_id: data.id,
      version: 1,
      auteur_id: session.user.id,
      snapshot: payload,
    });
    setMsg("Dossier enregistré.");
  }

  if (loading) return <div className="text-sub text-sm">Chargement…</div>;

  if (!marques.length) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 text-sm">
        Aucune marque en base. Importez vos référentiels véhicules/options dans Supabase (tables{" "}
        <code>marques</code>, <code>modeles</code>, <code>options</code>, <code>compatibilites</code>) pour
        activer le calculateur.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Calculateur de marge</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sub uppercase font-bold">Marque</label>
                <select value={marqueId || ""} onChange={(e) => setMarqueId(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]">
                  {marques.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-sub uppercase font-bold">Véhicule</label>
                <select value={modeleId || ""} onChange={(e) => setModeleId(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]">
                  {modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
            </div>
            {modele && (
              <div className="flex gap-6 mt-3 text-sm text-sub">
                <div>Prix usine HT : <b className="text-ink">{fmt(modele.prix_usine_ht)}</b></div>
                <div>Prix public TTC : <b className="text-ink">{fmt(modele.prix_public_ttc)}</b></div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Options usine ({optionsSelectionnables.length} disponibles)</label>
            <select
              className="w-full mt-2 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) setOptionsChoisiesIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}
            >
              <option value="">+ Ajouter une option usine…</option>
              {optionsSelectionnables.filter((o) => !optionsChoisiesIds.includes(o.id)).map((o) => (
                <option key={o.id} value={o.id}>{o.designation} — {fmt(o.prix_ttc)}</option>
              ))}
            </select>
            <div className="mt-3 space-y-1.5">
              {optionsChoisies.map((o) => (
                <div key={o.id} className="flex items-center gap-2 text-sm bg-[#FCFBF8] border border-border rounded-md px-2 py-1.5">
                  <span className="flex-1">{o.designation}</span>
                  <span className="text-sub">{fmt(o.prix_ttc)}</span>
                  <button onClick={() => setOptionsChoisiesIds((prev) => prev.filter((id) => id !== o.id))} className="text-neg px-1">×</button>
                </div>
              ))}
            </div>
            {optionsDeSerie.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[11px] text-sub mb-1.5">Inclus de série sur ce modèle</div>
                <div className="flex flex-wrap gap-1.5">
                  {optionsDeSerie.map((o) => (
                    <span key={o.id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#EEF4EF] text-pos">{o.designation}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Négociation</label>
            <div className="mt-2">
              <div className="text-xs text-sub">Prix négocié TTC (hors carte grise)</div>
              <input type="number" value={prixNegocie} onChange={(e) => setPrixNegocie(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs text-sub">Financement</div>
                <select value={financementActif ? "OUI" : "NON"} onChange={(e) => setFinancementActif(e.target.value === "OUI")} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]">
                  <option value="NON">Non</option>
                  <option value="OUI">Oui</option>
                </select>
              </div>
              {financementActif && (
                <div>
                  <div className="text-xs text-sub">Montant financé</div>
                  <input type="number" value={financementMontant} onChange={(e) => setFinancementMontant(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]" />
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="text-xs text-sub">Client</div>
              <input value={client} onChange={(e) => setClient(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FCFBF8]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {calc && (
            <>
              <div className="bg-ink text-white rounded-lg p-5">
                <div className="text-[11px] text-[#B9C4CA] uppercase font-bold">Marge totale de l'affaire</div>
                <div className="flex gap-8 mt-2">
                  <div>
                    <div className="text-[11px] text-[#B9C4CA]">Attendue (barème)</div>
                    <div className="text-2xl font-extrabold">{calc.destockage ? "Déstockage" : fmt(calc.E29)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#B9C4CA]">Réelle (prix négocié)</div>
                    <div className="text-2xl font-extrabold" style={{ color: calc.E33 >= 0 ? "#8FD19E" : "#E39C97" }}>{fmt(calc.E33)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 text-sm">
                <table className="w-full">
                  <tbody>
                    <tr className="border-t border-border"><td className="py-1.5 text-sub">Somme des coûts</td><td className="py-1.5 text-right">{fmt(calc.sommeCouts)}</td></tr>
                    <tr className="border-t border-border"><td className="py-1.5 text-sub">Taux de marge cible</td><td className="py-1.5 text-right">{calc.destockage ? "Déstockage" : fmtPct(calc.D28)}</td></tr>
                    <tr className="border-t border-border"><td className="py-1.5 text-sub">Remise / catalogue</td><td className="py-1.5 text-right">{fmt(calc.E27)} ({fmtPct(calc.D27)})</td></tr>
                    <tr className="border-t border-border"><td className="py-1.5 text-sub">Taux de marge réel</td><td className="py-1.5 text-right font-bold" style={{ color: calc.D34 >= (calc.D28 || 0) ? "#3F6B4F" : "#A6423B" }}>{fmtPct(calc.D34)}</td></tr>
                    <tr className="border-t border-border"><td className="py-1.5 text-sub">Commission vendeur</td><td className="py-1.5 text-right font-bold">{fmt(calc.commission)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button onClick={() => enregistrer("PROPOSITION")} className="flex-1 py-2.5 rounded-md border border-border bg-white font-bold text-sm">Enregistrer en proposition</button>
                <button onClick={() => enregistrer("VENDU")} className="flex-1 py-2.5 rounded-md bg-accent text-white font-bold text-sm">Marquer vendu</button>
              </div>
              {msg && <div className="text-xs text-sub">{msg}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
