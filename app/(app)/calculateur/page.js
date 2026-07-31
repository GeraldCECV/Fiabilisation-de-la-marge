"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { calculerMarge, BATTERIE_COUTS } from "@/lib/margeEngine";

const ANNEE_COURANTE = 2027;
const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtPct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) : "0") + " %";

export default function CalculateurPage() {
  const supabase = supabaseBrowser();

  const [marques, setMarques] = useState([]);
  const [marqueId, setMarqueId] = useState(null);
  const [modeles, setModeles] = useState([]);
  const [modeleId, setModeleId] = useState(null);
  const [options, setOptions] = useState([]);
  const [optionsChoisiesIds, setOptionsChoisiesIds] = useState([]);
  const [baremes, setBaremes] = useState([]);
  const [forfaits, setForfaits] = useState([]);

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
  const [client, setClient] = useState("");
  const [commentaires, setCommentaires] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [dossierIdActuel, setDossierIdActuel] = useState(null);
  const [dernierStatut, setDernierStatut] = useState("PROPOSITION");

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

  useEffect(() => {
    if (!marqueId) return;
    (async () => {
      const { data } = await supabase.from("modeles").select("*").eq("marque_id", marqueId).eq("actif", true).order("gamme").order("nom");
      setModeles(data || []);
      if (data && data.length) setModeleId(data[0].id);
    })();
  }, [marqueId]);

  useEffect(() => {
    if (!modeleId) return;
    (async () => {
      const { data } = await supabase
        .from("compatibilites")
        .select("statut, options ( id, designation, achat_ht, cession_pose, prix_ttc, poids_kg )")
        .eq("modele_id", modeleId);
      const liste = (data || []).filter((row) => row.options).map((row) => ({ ...row.options, statut: row.statut }));
      setOptions(liste);
      setOptionsChoisiesIds([]);
      setDossierIdActuel(null);
      setMsg("");
      const modele = modeles.find((mo) => mo.id === modeleId);
      if (modele) {
        const isCC = modele.type === "CAMPING_CAR";
        const cle = isCC ? "carte_grise_cc" : "carte_grise_caravane";
        const forfaitMiseALaRoute = Number(forfaits.find((f) => f.cle === cle)?.valeur) || (isCC ? 790 : 380);
        const prixParDefaut = Number(modele.prix_public_ttc) + forfaitMiseALaRoute;
        setPrixNegocie(prixParDefaut);
        setPrixAffichParc(prixParDefaut);
      }
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

  async function enregistrer(statut) {
    if (!modele || !calc) return;
    setMsg("");
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      statut,
      client_nom: client,
      vendeur_id: session.user.id,
      modele_id: modele.id,
      options_choisies: optionsChoisiesIds,
      stock_statut: stockStatut,
      numero_chassis: stockStatut === "STOCK" ? numeroChassis : null,
      frais_sortie_usine: Number(fraisSortieUsine) || 0,
      transport_usine: Number(transportUsine) || 0,
      cession_odoo: Number(cessionOdoo) || 0,
      transport_intersite: Number(transportIntersite) || 0,
      expo,
      batterie_choix: batterieChoix,
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
      taux_marge_reel: calc.D34,
      verrouille: statut === "VENDU",
      updated_at: new Date().toISOString(),
    };

    if (dossierIdActuel) {
      // Dossier déjà créé pendant cette session : on le met à jour, jamais de doublon.
      const { error } = await supabase.from("dossiers_vente").update(payload).eq("id", dossierIdActuel);
      if (error) { setMsg("Erreur d'enregistrement : " + error.message); setSaving(false); return; }
      const { data: histo } = await supabase
        .from("historique_dossier").select("version").eq("dossier_id", dossierIdActuel)
        .order("version", { ascending: false }).limit(1);
      const prochaineVersion = (histo?.[0]?.version || 0) + 1;
      await supabase.from("historique_dossier").insert({ dossier_id: dossierIdActuel, version: prochaineVersion, auteur_id: session.user.id, snapshot: payload });
      setMsg("Dossier mis à jour.");
    } else {
      const { data, error } = await supabase.from("dossiers_vente").insert(payload).select().single();
      if (error) { setMsg("Erreur d'enregistrement : " + error.message); setSaving(false); return; }
      setDossierIdActuel(data.id);
      await supabase.from("historique_dossier").insert({ dossier_id: data.id, version: 1, auteur_id: session.user.id, snapshot: payload });
      setMsg("Dossier enregistré.");
    }
    setDernierStatut(statut);
    setSaving(false);
  }

  async function nouvelleProposition() {
    // Sauvegarde d'abord ce qui est en cours (si un véhicule est sélectionné), pour ne rien perdre.
    if (modele && calc) {
      await enregistrer(dernierStatut);
    }
    // Puis on vide le formulaire pour une nouvelle proposition, à un autre nom.
    setClient("");
    setStockStatut("COMMANDE");
    setNumeroChassis("");
    setFraisSortieUsine(0);
    setTransportUsine(0);
    setCessionOdoo(0);
    setTransportIntersite(0);
    setExpo("PAS_EXPO");
    setBatterieChoix("Camping car avec batterie");
    setOptionsChoisiesIds([]);
    setFinancementActif(false);
    setFinancementMontant(0);
    setFinancementOrganisme("");
    setRachatActif(false);
    setRachatMontant(0);
    setPrixAffichParc(0);
    setCommentaires("");
    setDossierIdActuel(null);
    setDernierStatut("PROPOSITION");
    if (modele) setPrixNegocie(modele.prix_public_ttc);
    setMsg("Proposition précédente enregistrée. Formulaire prêt pour un nouveau client.");
  }

  if (loading) return <div className="text-sub text-sm">Chargement…</div>;
  if (!marques.length) {
    return <div className="bg-surface border border-border rounded-lg p-6 text-sm">Aucune marque en base. Importez votre référentiel véhicules/options.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Calculateur de marge</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-sub uppercase font-bold">Marque</label>
                <select value={marqueId || ""} onChange={(e) => setMarqueId(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  {marques.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-sub uppercase font-bold">Véhicule</label>
                <select value={modeleId || ""} onChange={(e) => setModeleId(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  {modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-sub">Statut stock</label>
                <select value={stockStatut} onChange={(e) => setStockStatut(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="COMMANDE">Commande usine</option>
                  <option value="STOCK">En stock</option>
                  <option value="REASSORT">Réassort</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-sub">Durée d'exposition</label>
                <select value={expo} onChange={(e) => setExpo(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="PAS_EXPO">Pas d'expo</option>
                  <option value="EXPO_ANNEE">Expo de l'année</option>
                  <option value="EXPO_1_AN">Expo 1 an</option>
                  <option value="EXPO_2_ANS">Expo 2 ans</option>
                </select>
              </div>
            </div>
            {stockStatut === "STOCK" && (
              <div className="mt-3">
                <label className="text-xs text-sub">N° de série / châssis</label>
                <input value={numeroChassis} onChange={(e) => setNumeroChassis(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
            )}
            {modele && (
              <div className="flex gap-6 mt-3 text-sm text-sub">
                <div>Prix usine HT : <b className="text-ink">{fmt(modele.prix_usine_ht)}</b></div>
                <div>Prix public TTC : <b className="text-ink">{fmt(modele.prix_public_ttc)}</b></div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <label className="text-xs text-sub uppercase font-bold">Frais annexes véhicule</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div className="text-xs text-sub">Frais sortie usine</div>
                <input type="number" value={fraisSortieUsine} onChange={(e) => setFraisSortieUsine(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
              <div>
                <div className="text-xs text-sub">Transport usine</div>
                <input type="number" value={transportUsine} onChange={(e) => setTransportUsine(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
              <div>
                <div className="text-xs text-sub">Cession Odoo / travaux ext.</div>
                <input type="number" value={cessionOdoo} onChange={(e) => setCessionOdoo(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
              <div>
                <div className="text-xs text-sub">Transport inter-site</div>
                <input type="number" value={transportIntersite} onChange={(e) => setTransportIntersite(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-sub">Batterie</div>
              <select value={batterieChoix} onChange={(e) => setBatterieChoix(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                {Object.keys(BATTERIE_COUTS).map((nom) => (
                  <option key={nom} value={nom}>{nom}</option>
                ))}
              </select>
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
              <div className="text-xs text-sub">Prix négocié TTC (hors carte grise)</div>
              <input type="number" value={prixNegocie} onChange={(e) => setPrixNegocie(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
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
                <div>
                  <div className="text-xs text-sub">Montant financé</div>
                  <input type="number" value={financementMontant} onChange={(e) => setFinancementMontant(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
                </div>
              )}
            </div>
            {financementActif && (
              <div className="mt-3">
                <div className="text-xs text-sub">Organisme</div>
                <select value={financementOrganisme} onChange={(e) => setFinancementOrganisme(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]">
                  <option value="">—</option>
                  <option>CETELEM</option>
                  <option>FINANCO</option>
                  <option>LOISIRS FI</option>
                  <option>SANTANDER</option>
                  <option>VIAXEL</option>
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
                <div>
                  <div className="text-xs text-sub">Montant rachat</div>
                  <input type="number" value={rachatMontant} onChange={(e) => setRachatMontant(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
                </div>
              )}
            </div>
            {rachatActif && (
              <div className="mt-3">
                <div className="text-xs text-sub">Prix affiché sur parc</div>
                <input type="number" value={prixAffichParc} onChange={(e) => setPrixAffichParc(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
              </div>
            )}
            <div className="mt-3">
              <div className="text-xs text-sub">Client</div>
              <input value={client} onChange={(e) => setClient(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
            </div>
            <div className="mt-3">
              <div className="text-xs text-sub">Bon de préparation / commentaires</div>
              <textarea value={commentaires} onChange={(e) => setCommentaires(e.target.value)} rows={3} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {calc && (
            <>
              <div className="bg-ink text-white rounded-lg p-5">
                <div className="text-[11px] text-[#A9C7C8] uppercase font-bold">Marge totale de l'affaire</div>
                <div className="flex gap-8 mt-2">
                  <div>
                    <div className="text-[11px] text-[#A9C7C8]">Attendue (barème)</div>
                    <div className="text-2xl font-extrabold">{calc.destockage ? "Déstockage" : fmt(calc.E29)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#A9C7C8]">Réelle</div>
                    <div className="text-2xl font-extrabold" style={{ color: calc.E33 >= 0 ? "#C4CB7E" : "#F3958D" }}>{fmt(calc.E33)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 text-sm">
                <table className="w-full">
                  <tbody>
                    {[
                      ["Prix usine HT", fmt(calc.E19)],
                      ["Frais sortie usine", fmt(calc.E20)],
                      ["Transport usine", fmt(calc.E21)],
                      ["Cession Odoo / travaux ext.", fmt(calc.E22)],
                      ["Transport inter-site", fmt(calc.E23)],
                      ["Forfait admin", fmt(calc.I4)],
                      ["Forfait heures atelier", fmt(calc.I7)],
                      ["Options usine (achat HT)", fmt(calc.I27)],
                      ["Provision SAV + expo", fmt(calc.I45)],
                      ["Somme des coûts", fmt(calc.sommeCouts)],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-t border-border">
                        <td className="py-1.5 text-sub">{k}</td>
                        <td className="py-1.5 text-right">{v}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border">
                      <td className="py-1.5 text-sub">Taux de marge cible</td>
                      <td className="py-1.5 text-right">{calc.destockage ? "Déstockage" : fmtPct(calc.D28)}</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 text-sub">Taux de marge réel</td>
                      <td className="py-1.5 text-right font-bold" style={{ color: calc.D34 >= (calc.D28 || 0) ? "#B5BC61" : "#EC655D" }}>{fmtPct(calc.D34)}</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 text-sub">Commission vendeur</td>
                      <td className="py-1.5 text-right font-bold">{fmt(calc.commission)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between">
                <span className="text-lg font-bold" style={{ color: "#EC655D" }}>Remise</span>
                <span className="text-2xl font-extrabold" style={{ color: "#EC655D" }}>{fmt(calc.E27)} ({fmtPct(calc.D27)})</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => enregistrer("PROPOSITION")} disabled={saving} className="flex-1 py-2.5 rounded-md border border-border bg-white font-bold text-sm disabled:opacity-60">Enregistrer en proposition</button>
                <button onClick={() => enregistrer("VENDU")} disabled={saving} className="flex-1 py-2.5 rounded-md bg-ink text-white font-bold text-sm disabled:opacity-60">Marquer vendu</button>
              </div>
              <button
                onClick={nouvelleProposition}
                disabled={saving}
                className="w-full py-2 rounded-md border border-border bg-white text-sm font-bold text-sub disabled:opacity-60"
              >
                ⟳ Nouvelle proposition (enregistre celle-ci avant de vider le formulaire)
              </button>
              {msg && <div className="text-xs text-sub">{msg}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
