"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { calculerMarge, BATTERIE_COUTS } from "@/lib/margeEngine";

const ANNEE_COURANTE = 2027;
const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtPct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) : "0") + " %";

export default function EditDossierPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dossier, setDossier] = useState(null);
  const [modele, setModele] = useState(null);
  const [baremes, setBaremes] = useState([]);
  const [forfaits, setForfaits] = useState([]);
  const [options, setOptions] = useState([]);
  const [optionsChoisiesIds, setOptionsChoisiesIds] = useState([]);
  const [peutModifier, setPeutModifier] = useState(true);

  const [client, setClient] = useState("");
  const [operations, setOperations] = useState([]);
  const [operationId, setOperationId] = useState("");
  const [statut, setStatut] = useState("PROPOSITION");
  const [stockStatut, setStockStatut] = useState("COMMANDE");
  const [numeroChassis, setNumeroChassis] = useState("");
  const [fraisSortieUsine, setFraisSortieUsine] = useState(0);
  const [transportUsine, setTransportUsine] = useState(0);
  const [cessionOdoo, setCessionOdoo] = useState(0);
  const [transportIntersite, setTransportIntersite] = useState(0);
  const [expo, setExpo] = useState("PAS_EXPO");
  const [batterieChoix, setBatterieChoix] = useState("Camping car avec batterie");
  const [prixNegocie, setPrixNegocie] = useState(0);
  const [prixAffichParc, setPrixAffichParc] = useState(0);
  const [financementActif, setFinancementActif] = useState(false);
  const [financementMontant, setFinancementMontant] = useState(0);
  const [financementOrganisme, setFinancementOrganisme] = useState("");
  const [rachatActif, setRachatActif] = useState(false);
  const [rachatMontant, setRachatMontant] = useState(0);
  const [commentaires, setCommentaires] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
      const { data: d } = await supabase.from("dossiers_vente").select("*").eq("id", params.id).single();
      if (!d) { setError("Dossier introuvable."); setLoading(false); return; }
      if (d.verrouille && profil?.role !== "RESPONSABLE") setPeutModifier(false);

      const { data: m } = await supabase.from("modeles").select("*").eq("id", d.modele_id).single();
      const [{ data: b }, { data: f }, { data: compat }, { data: ops }] = await Promise.all([
        supabase.from("baremes_marge").select("*"),
        supabase.from("forfaits_fixes").select("*"),
        supabase.from("compatibilites").select("statut, options ( id, designation, achat_ht, cession_pose, prix_ttc, poids_kg )").eq("modele_id", d.modele_id),
        supabase.from("operations_commerciales").select("id, nom").order("nom"),
      ]);

      setOperations(ops || []);
      setOperationId(d.operation_id || "");
      setDossier(d);
      setModele(m);
      setBaremes(b || []);
      setForfaits(f || []);
      setOptions((compat || []).filter((r) => r.options).map((r) => ({ ...r.options, statut: r.statut })));
      setOptionsChoisiesIds(d.options_choisies || []);
      setClient(d.client_nom || "");
      setStatut(d.statut);
      setStockStatut(d.stock_statut || "STOCK");
      setNumeroChassis(d.numero_chassis || "");
      setFraisSortieUsine(d.frais_sortie_usine || 0);
      setTransportUsine(d.transport_usine || 0);
      setCessionOdoo(d.cession_odoo || 0);
      setTransportIntersite(d.transport_intersite || 0);
      setExpo(d.expo || "PAS_EXPO");
      setBatterieChoix(d.batterie_choix || "Camping car avec batterie");
      setPrixNegocie(d.prix_negocie_ttc || 0);
      setPrixAffichParc(d.prix_affiche_parc || 0);
      setFinancementActif((d.financement_montant || 0) > 0);
      setFinancementMontant(d.financement_montant || 0);
      setFinancementOrganisme(d.financement_organisme || "");
      setRachatActif(!!d.rachat_actif);
      setRachatMontant(d.rachat_montant || 0);
      setCommentaires(d.commentaires || "");
      setLoading(false);
    })();
  }, [params.id]);

  const optionsSelectionnables = options.filter((o) => o.statut === "OPTION");
  const optionsDeSerie = options.filter((o) => o.statut === "SERIE");
  const optionsChoisies = optionsSelectionnables.filter((o) => optionsChoisiesIds.includes(o.id));

  const calc = useMemo(() => {
    if (!modele) return null;
    return calculerMarge({
      modele, optionsChoisies, baremes, forfaits,
      prixNegocieTtc: Number(prixNegocie) || 0,
      financement: { actif: financementActif, montant: Number(financementMontant) || 0 },
      anneeCourante: ANNEE_COURANTE,
      fraisAnnexes: {
        fraisSortieUsine: Number(fraisSortieUsine) || 0,
        transportUsine: Number(transportUsine) || 0,
        cessionOdoo: Number(cessionOdoo) || 0,
        transportIntersite: Number(transportIntersite) || 0,
      },
      expo,
      batterieChoix,
    });
  }, [modele, optionsChoisies, baremes, forfaits, prixNegocie, financementActif, financementMontant, fraisSortieUsine, transportUsine, cessionOdoo, transportIntersite, expo, batterieChoix]);

  async function enregistrer() {
    if (!calc || !dossier) return;
    setSaving(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();

    const payload = {
      statut, client_nom: client,
      operation_id: operationId || null,
      options_choisies: optionsChoisiesIds,
      stock_statut: stockStatut,
      numero_chassis: stockStatut === "STOCK" ? numeroChassis : null,
      frais_sortie_usine: Number(fraisSortieUsine) || 0,
      transport_usine: Number(transportUsine) || 0,
      cession_odoo: Number(cessionOdoo) || 0,
      transport_intersite: Number(transportIntersite) || 0,
      expo, batterie_choix: batterieChoix,
      prix_negocie_ttc: Number(prixNegocie) || 0,
      prix_affiche_parc: rachatActif ? Number(prixAffichParc) || 0 : null,
      financement_organisme: financementActif ? (financementOrganisme || "À préciser") : null,
      financement_montant: financementActif ? Number(financementMontant) || 0 : 0,
      rachat_actif: rachatActif,
      rachat_montant: rachatActif ? Number(rachatMontant) || 0 : 0,
      commentaires,
      marge_attendue: calc.E29,
      marge_reelle: calc.E33,
      marge_financement_reelle: calc.E35,
      commission_vendeur: calc.commission,
      remise_pct: calc.D27,
      remise_montant: calc.E27,
      taux_marge_reel: calc.D34,
      verrouille: statut === "VENDU",
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("dossiers_vente").update(payload).eq("id", dossier.id);
    if (updateError) { setError("Erreur d'enregistrement : " + updateError.message); setSaving(false); return; }

    const { data: histo } = await supabase.from("historique_dossier").select("version").eq("dossier_id", dossier.id).order("version", { ascending: false }).limit(1);
    const prochaineVersion = (histo?.[0]?.version || 0) + 1;
    await supabase.from("historique_dossier").insert({ dossier_id: dossier.id, version: prochaineVersion, auteur_id: session.user.id, snapshot: payload });

    setSaving(false);
    router.push(`/dossiers/${dossier.id}`);
    router.refresh();
  }

  if (loading) return <div className="text-sub text-sm">Chargement…</div>;
  if (error && !dossier) return <div className="text-neg text-sm">{error}</div>;
  if (!peutModifier) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 text-sm">
        Ce dossier est <b>verrouillé</b> (vendu). Seul un responsable peut le modifier.
        <div className="mt-3"><Link href={`/dossiers/${params.id}`} className="text-accent font-bold">&larr; Retour à la fiche</Link></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dossiers/${params.id}`} className="text-sub text-sm hover:text-ink">&larr; Annuler</Link>
        <h1 className="text-xl font-extrabold">Modifier le dossier — {modele?.nom}</h1>
        <span />
      </div>

      {dossier?.verrouille && (
        <div className="bg-[#FBF3E7] border border-accent/30 text-accent text-xs rounded-md px-3 py-2 mb-4">
          Ce dossier est verrouillé (vendu). Votre modification créera une nouvelle version dans l'historique.
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sub uppercase font-bold">Statut</label>
                <select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="PROPOSITION">Proposition</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="VENDU">Vendu</option>
                  <option value="PERDU">Perdu</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-sub uppercase font-bold">Statut stock</label>
                <select value={stockStatut} onChange={(e) => setStockStatut(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="COMMANDE">Commande usine</option>
                  <option value="STOCK">En stock</option>
                  <option value="REASSORT">Réassort</option>
                </select>
              </div>
            </div>
            {stockStatut === "STOCK" && (
              <div className="mt-3">
                <label className="text-xs text-sub uppercase font-bold">N° de série / châssis</label>
                <input value={numeroChassis} onChange={(e) => setNumeroChassis(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
            )}
            <div className="mt-3">
              <label className="text-xs text-sub uppercase font-bold">Client</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
            </div>
            <div className="mt-3">
              <label className="text-xs text-sub uppercase font-bold">Opération commerciale</label>
              <select value={operationId} onChange={(e) => setOperationId(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                <option value="">Aucune</option>
                {operations.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Frais annexes véhicule</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><div className="text-xs text-sub">Frais sortie usine</div><input type="number" value={fraisSortieUsine} onChange={(e) => setFraisSortieUsine(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
              <div><div className="text-xs text-sub">Transport usine</div><input type="number" value={transportUsine} onChange={(e) => setTransportUsine(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
              <div><div className="text-xs text-sub">Cession Odoo / travaux ext.</div><input type="number" value={cessionOdoo} onChange={(e) => setCessionOdoo(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
              <div><div className="text-xs text-sub">Transport inter-site</div><input type="number" value={transportIntersite} onChange={(e) => setTransportIntersite(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs text-sub">Durée d'exposition</div>
                <select value={expo} onChange={(e) => setExpo(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="PAS_EXPO">Pas d'expo</option>
                  <option value="EXPO_ANNEE">Expo de l'année</option>
                  <option value="EXPO_1_AN">Expo 1 an</option>
                  <option value="EXPO_2_ANS">Expo 2 ans</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-sub">Batterie</div>
                <select value={batterieChoix} onChange={(e) => setBatterieChoix(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  {Object.entries(BATTERIE_COUTS).map(([nom, cout]) => (
                    <option key={nom} value={nom}>{nom}{cout.prixTtc > 0 ? ` (+${cout.prixTtc} €)` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Options usine ({optionsSelectionnables.length} disponibles)</label>
            <select className="w-full mt-2 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" value=""
              onChange={(e) => { const id = e.target.value; if (id) setOptionsChoisiesIds((prev) => (prev.includes(id) ? prev : [...prev, id])); }}>
              <option value="">+ Ajouter une option usine…</option>
              {optionsSelectionnables.filter((o) => !optionsChoisiesIds.includes(o.id)).map((o) => (
                <option key={o.id} value={o.id}>{o.designation} — {fmt(o.prix_ttc)}</option>
              ))}
            </select>
            <div className="mt-3 space-y-1.5">
              {optionsChoisies.map((o) => (
                <div key={o.id} className="flex items-center gap-2 text-sm bg-[#FAF8F0] border border-border rounded-md px-2 py-1.5">
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
                  {optionsDeSerie.map((o) => <span key={o.id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF1E3] text-pos">{o.designation}</span>)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Négociation</label>
            <div>
              <div className="text-xs text-sub">Prix négocié TTC (hors carte grise)</div><input type="number" value={prixNegocie} onChange={(e) => setPrixNegocie(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs text-sub">Financement</div>
                <select value={financementActif ? "OUI" : "NON"} onChange={(e) => setFinancementActif(e.target.value === "OUI")} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="NON">Non</option>
                  <option value="OUI">Oui</option>
                </select>
              </div>
              {financementActif && (
                <div><div className="text-xs text-sub">Montant financé</div><input type="number" value={financementMontant} onChange={(e) => setFinancementMontant(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
              )}
            </div>
            {financementActif && (
              <div className="mt-3">
                <div className="text-xs text-sub">Organisme</div>
                <select value={financementOrganisme} onChange={(e) => setFinancementOrganisme(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="">—</option>
                  <option>CETELEM</option><option>ARKEA</option><option>LOISIRS FINANCE</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs text-sub">Rachat véhicule client</div>
                <select value={rachatActif ? "OUI" : "NON"} onChange={(e) => setRachatActif(e.target.value === "OUI")} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="NON">Non</option>
                  <option value="OUI">Oui</option>
                </select>
              </div>
              {rachatActif && (
                <div><div className="text-xs text-sub">Montant rachat</div><input type="number" value={rachatMontant} onChange={(e) => setRachatMontant(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" /></div>
              )}
            </div>
            {rachatActif && (
              <div className="mt-3">
                <div className="text-xs text-sub">Prix affiché sur parc</div>
                <input type="number" value={prixAffichParc} onChange={(e) => setPrixAffichParc(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
            )}
            <div className="mt-3">
              <div className="text-xs text-sub">Bon de préparation / commentaires</div>
              <textarea value={commentaires} onChange={(e) => setCommentaires(e.target.value)} rows={3} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {calc && (
            <div className="bg-ink text-white rounded-lg p-5">
              <div className="text-[11px] text-[#A9C7C8] uppercase font-bold">Marge recalculée</div>
              <div className="flex gap-8 mt-2">
                <div><div className="text-[11px] text-[#A9C7C8]">Attendue</div><div className="text-2xl font-extrabold">{calc.destockage ? "Déstockage" : fmt(calc.E29)}</div></div>
                <div><div className="text-[11px] text-[#A9C7C8]">Réelle</div><div className="text-2xl font-extrabold" style={{ color: calc.E33 >= 0 ? "#C4CB7E" : "#F3958D" }}>{fmt(calc.E33)}</div></div>
              </div>
              <div className="text-sm mt-3 text-[#A9C7C8]">Commission vendeur : <b className="text-white">{fmt(calc.commission)}</b></div>
            </div>
          )}
          <button onClick={enregistrer} disabled={saving} className="w-full py-2.5 rounded-md bg-ink text-white font-bold text-sm disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
          {error && <div className="text-neg text-xs">{error}</div>}
        </div>
      </div>
    </div>
  );
}
