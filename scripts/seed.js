// Import du référentiel véhicules/options (Dreamer + Rapido) vers Supabase.
//
// Usage :
//   npm run seed
//
// Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local (Project Settings → API → service_role).
// Cette clé contourne le RLS : ne JAMAIS l'exposer côté navigateur, uniquement en local/CI.
//
// Le script est idempotent : il met À JOUR (upsert) les modèles/options déjà en base au lieu
// de les supprimer, pour ne jamais casser les dossiers de vente qui les référencent.

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { VEHICULES, OPTIONS } = require("./seedData");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies dans .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const marqueNoms = [...new Set(VEHICULES.map((v) => v.marque))];
  console.log(`Marques à importer : ${marqueNoms.join(", ")}`);

  // 1. Marques (créées si absentes)
  const marqueIdParNom = {};
  for (const nom of marqueNoms) {
    const { data: existing, error: selErr } = await supabase
      .from("marques").select("id").eq("nom", nom).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      marqueIdParNom[nom] = existing.id;
    } else {
      const { data, error } = await supabase.from("marques").insert({ nom }).select().single();
      if (error) throw error;
      marqueIdParNom[nom] = data.id;
    }
  }

  // 2. Modèles — upsert sur (marque_id, nom) : met à jour si le véhicule existe déjà,
  //    l'insère sinon. Ne supprime jamais rien (préserve les dossiers de vente existants).
  const modeleIdParCode = {};
  for (const v of VEHICULES) {
    const { data, error } = await supabase
      .from("modeles")
      .upsert(
        {
          marque_id: marqueIdParNom[v.marque],
          nom: v.nom,
          gamme: v.gamme,
          type: v.type,
          collection: v.collection,
          prix_usine_ht: v.prixUsineHt,
          prix_public_ttc: v.prixPublicTtc,
          actif: true,
        },
        { onConflict: "marque_id,nom" }
      )
      .select()
      .single();
    if (error) throw error;
    modeleIdParCode[v.id] = data.id;
  }
  console.log(`${VEHICULES.length} modèles importés (mis à jour ou créés).`);

  // 3. Options — on repart de zéro pour les options des marques concernées.
  //    Aucune contrainte de clé étrangère stricte ne relie les dossiers de vente aux options
  //    (elles sont stockées comme simple liste d'identifiants), donc pas de risque de blocage.
  //    Plusieurs options partagent le même nom entre gammes (ex. "Sur-matelas...") avec des prix
  //    différents, donc pas d'upsert par nom ici — juste marque_id.
  const marqueIds = Object.values(marqueIdParNom);
  const { error: delOptionsErr } = await supabase.from("options").delete().in("marque_id", marqueIds);
  if (delOptionsErr) throw delOptionsErr;

  const optionIdParCode = {};
  for (const o of OPTIONS) {
    const { data, error } = await supabase
      .from("options")
      .insert({
        marque_id: marqueIdParNom[o.marque],
        designation: o.nom,
        achat_ht: o.achatHt,
        cession_pose: o.cessionPose,
        prix_ttc: o.prixTtc,
        poids_kg: o.poids ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    optionIdParCode[o.id] = data.id;
  }
  console.log(`${OPTIONS.length} options importées.`);

  // 4. Compatibilités — on repart de zéro pour les modèles concernés (aucune référence
  //    externe ne pointe vers cette table, donc pas de risque de casser des dossiers).
  const modeleIds = Object.values(modeleIdParCode);
  const { error: delCompatErr } = await supabase.from("compatibilites").delete().in("modele_id", modeleIds);
  if (delCompatErr) throw delCompatErr;

  const statutMap = { O: "OPTION", S: "SERIE" };
  const rows = [];
  for (const o of OPTIONS) {
    for (const [codeVehicule, statut] of Object.entries(o.compat)) {
      if (!statut || statut === "-") continue;
      const modeleId = modeleIdParCode[codeVehicule];
      if (!modeleId) continue;
      rows.push({ modele_id: modeleId, option_id: optionIdParCode[o.id], statut: statutMap[statut] });
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from("compatibilites").insert(rows.slice(i, i + chunkSize));
    if (error) throw error;
  }
  console.log(`${rows.length} lignes de compatibilité importées.`);

  console.log("Import terminé avec succès.");
}

main().catch((err) => {
  console.error("Échec de l'import :", err);
  process.exit(1);
});
