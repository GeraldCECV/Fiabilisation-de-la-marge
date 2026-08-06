import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { VEHICULES, OPTIONS } from "@/scripts/seedData";
import { EQUIPEMENTS_YPOCAMP } from "@/scripts/equipementsYpocampData";

export const maxDuration = 60;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Reproduit scripts/seed.js (npm run seed), déclenchable depuis l'app en production sans
// terminal. Idempotent : modèles mis à jour (upsert), options + compatibilités reconstruites
// intégralement pour les marques concernées. Tout est fait par batchs groupés (au lieu d'un
// appel Supabase par ligne) pour rester largement sous le timeout serveur même avec plusieurs
// centaines de modèles/options.
export async function POST(request) {
  try {
    console.log("[RESYNC] Début resynchronisation référentiel");
    const supabase = supabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
    if (profil?.role !== "RESPONSABLE") return NextResponse.json({ error: "Réservé aux responsables" }, { status: 403 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });

    const admin = supabaseAdmin();

    // 1. Marques (peu nombreuses, une requête chacune reste négligeable)
    const marqueNoms = [...new Set(VEHICULES.map((v) => v.marque))];
    const marqueIdParNom = {};
    for (const nom of marqueNoms) {
      const { data: existing, error: selErr } = await admin.from("marques").select("id").eq("nom", nom).maybeSingle();
      if (selErr) throw new Error(`Marque ${nom}: ${selErr.message}`);
      if (existing) {
        marqueIdParNom[nom] = existing.id;
      } else {
        const { data, error } = await admin.from("marques").insert({ nom }).select().single();
        if (error) throw new Error(`Marque ${nom}: ${error.message}`);
        marqueIdParNom[nom] = data.id;
      }
    }

    // 2. Modèles — upsert PAR BATCH de 50 (au lieu d'un appel par modèle). onConflict garantit
    // l'idempotence ; .select() sur chaque batch renvoie les lignes, réassociées par
    // (marque_id, nom) plutôt que par index pour rester fiable.
    const modeleIdParCode = {};
    const vehiculeBatches = chunk(VEHICULES, 50);
    for (const batch of vehiculeBatches) {
      const rows = batch.map((v) => ({
        marque_id: marqueIdParNom[v.marque],
        nom: v.nom,
        gamme: v.gamme,
        type: v.type,
        collection: v.collection,
        type_carrosserie: v.typeCarrosserie || null,
        prix_usine_ht: v.prixUsineHt,
        prix_public_ttc: v.prixPublicTtc,
        actif: true,
      }));
      const { data, error } = await admin.from("modeles").upsert(rows, { onConflict: "marque_id,nom" }).select();
      if (error) throw new Error("Modèles (batch): " + error.message);
      const parCle = {};
      for (const d of data) parCle[`${d.marque_id}::${d.nom}`] = d.id;
      for (const v of batch) {
        const id = parCle[`${marqueIdParNom[v.marque]}::${v.nom}`];
        if (id) modeleIdParCode[v.id] = id;
      }
    }
    console.log(`[RESYNC] ${VEHICULES.length} modèles synchronisés (${vehiculeBatches.length} batchs)`);

    // 2bis. Nettoyage des modèles orphelins : un modèle dont le nom a changé (ex: correction
    // d'un libellé) n'est plus retrouvé par l'upsert ci-dessus (qui matche sur marque_id+nom) et
    // reste dupliqué en base sous son ancien nom. On désactive (jamais on ne supprime, pour ne
    // pas casser les dossiers déjà vendus qui y font référence) tout modèle actif d'une marque
    // concernée dont le nom ne correspond plus à rien dans seedData.js.
    let orphelinsDesactives = 0;
    for (const [nomMarque, marqueId] of Object.entries(marqueIdParNom)) {
      const nomsAttendus = new Set(VEHICULES.filter((v) => v.marque === nomMarque).map((v) => v.nom));
      const { data: modelesActifs, error: selErr } = await admin
        .from("modeles").select("id, nom").eq("marque_id", marqueId).eq("actif", true);
      if (selErr) throw new Error(`Lecture modèles ${nomMarque}: ${selErr.message}`);
      const idsOrphelins = (modelesActifs || []).filter((m) => !nomsAttendus.has(m.nom)).map((m) => m.id);
      if (idsOrphelins.length > 0) {
        const { error: majErr } = await admin.from("modeles").update({ actif: false }).in("id", idsOrphelins);
        if (majErr) throw new Error(`Désactivation modèles orphelins ${nomMarque}: ${majErr.message}`);
        orphelinsDesactives += idsOrphelins.length;
      }
    }
    if (orphelinsDesactives > 0) console.log(`[RESYNC] ${orphelinsDesactives} modèles orphelins désactivés (anciens noms)`);

    // 3. Options — repart de zéro pour les marques concernées, insert PAR BATCH de 50
    const marqueIds = Object.values(marqueIdParNom);
    const { error: delOptionsErr } = await admin.from("options").delete().in("marque_id", marqueIds);
    if (delOptionsErr) throw new Error("Suppression options: " + delOptionsErr.message);

    const optionIdParCode = {};
    const optionBatches = chunk(OPTIONS, 50);
    for (const batch of optionBatches) {
      const rows = batch.map((o) => ({
        marque_id: marqueIdParNom[o.marque],
        designation: o.nom,
        achat_ht: o.achatHt,
        cession_pose: o.cessionPose,
        prix_ttc: o.prixTtc,
        poids_kg: o.poids ?? null,
      }));
      const { data, error } = await admin.from("options").insert(rows).select();
      if (error) throw new Error("Options (batch): " + error.message);
      // Insert simple (pas d'upsert) : Postgres préserve l'ordre d'entrée pour une seule
      // instruction INSERT ... VALUES ... RETURNING, donc l'association par index est fiable ici.
      batch.forEach((o, i) => { optionIdParCode[o.id] = data[i].id; });
    }
    console.log(`[RESYNC] ${OPTIONS.length} options réinsérées (${optionBatches.length} batchs)`);

    // 4. Compatibilités — repart de zéro pour les modèles concernés
    const modeleIds = Object.values(modeleIdParCode);
    const { error: delCompatErr } = await admin.from("compatibilites").delete().in("modele_id", modeleIds);
    if (delCompatErr) throw new Error("Suppression compatibilités: " + delCompatErr.message);

    const statutMap = { O: "OPTION", S: "SERIE" };
    const compatRows = [];
    for (const o of OPTIONS) {
      for (const [codeVehicule, statut] of Object.entries(o.compat)) {
        if (!statut || statut === "-") continue;
        const modeleId = modeleIdParCode[codeVehicule];
        const optionId = optionIdParCode[o.id];
        if (!modeleId || !optionId) continue;
        compatRows.push({ modele_id: modeleId, option_id: optionId, statut: statutMap[statut] });
      }
    }

    for (const batch of chunk(compatRows, 500)) {
      const { error } = await admin.from("compatibilites").insert(batch);
      if (error) throw new Error("Compatibilités: " + error.message);
    }
    console.log(`[RESYNC] ${compatRows.length} lignes de compatibilité réinsérées`);

    // 5. Équipements Ypocamp — catalogue indépendant (pas lié aux modèles), repart de zéro
    const { error: delEquipErr } = await admin.from("equipements_ypocamp").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delEquipErr) throw new Error("Suppression équipements Ypocamp: " + delEquipErr.message);

    const equipRows = EQUIPEMENTS_YPOCAMP.map((e) => ({
      categorie: e.categorie,
      sous_categorie: e.sousCategorie,
      designation: e.designation,
      achat_ht: e.achatHt,
      pose_ventilee_ht: e.poseVentileeHt,
      prix_ttc: e.prixTtc,
      actif: true,
    }));
    for (const batch of chunk(equipRows, 50)) {
      const { error } = await admin.from("equipements_ypocamp").insert(batch);
      if (error) throw new Error("Équipements Ypocamp: " + error.message);
    }
    console.log(`[RESYNC] ${equipRows.length} équipements Ypocamp réinsérés`);

    return NextResponse.json({
      success: true,
      message: `✅ Référentiel resynchronisé : ${VEHICULES.length} modèles, ${OPTIONS.length} options, ${compatRows.length} compatibilités (${marqueNoms.join(", ")}), ${equipRows.length} équipements Ypocamp.${orphelinsDesactives > 0 ? ` ${orphelinsDesactives} anciens modèles désactivés.` : ""}`,
    });
  } catch (err) {
    console.error("[RESYNC] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
