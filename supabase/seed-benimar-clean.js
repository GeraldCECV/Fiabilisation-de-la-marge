const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function call(table, data) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function seedBenimar() {
  console.log("🚀 Intégration Benimar 2027...\n");

  try {
    // 1. Marque Benimar
    await call("marques", { id: "benimar", nom: "Benimar", type_principal: "camping-car" });
    console.log("✅ Marque Benimar");

    // 2. Modèles Benimar
    const modeles = [
      { id: "benimar_mi262", marque_id: "benimar", reference: "MI262", nom: "Mileo 262", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 705, poids_kg: 5065, prix_ht: 53490, prix_ttc: 71990 },
      { id: "benimar_mi263", marque_id: "benimar", reference: "MI263", nom: "Mileo 263", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 54590, prix_ttc: 73490 },
      { id: "benimar_mi268", marque_id: "benimar", reference: "MI268", nom: "Mileo 268", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 55490, prix_ttc: 74490 },
      { id: "benimar_mi298", marque_id: "benimar", reference: "MI298", nom: "Mileo 298", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 55490, prix_ttc: 74490 },
      { id: "benimar_am968", marque_id: "benimar", reference: "AM968", nom: "Amphitryon 968", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 740, poids_kg: 7423, prix_ht: 62990, prix_ttc: 85990 },
      { id: "benimar_am981", marque_id: "benimar", reference: "AM981", nom: "Amphitryon 981", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 740, poids_kg: 5989, prix_ht: 58490, prix_ttc: 79990 },
      { id: "benimar_am998", marque_id: "benimar", reference: "AM998", nom: "Amphitryon 998", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 740, poids_kg: 7423, prix_ht: 64390, prix_ttc: 87490 },
      { id: "benimar_yr841", marque_id: "benimar", reference: "YR841", nom: "Yrteo 841", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 640, poids_kg: 6390, prix_ht: 45990, prix_ttc: 61990 },
      { id: "benimar_yr862", marque_id: "benimar", reference: "YR862", nom: "Yrteo 862", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6999, prix_ht: 45990, prix_ttc: 61990 },
      { id: "benimar_yr881", marque_id: "benimar", reference: "YR881", nom: "Yrteo 881", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 650, poids_kg: 5999, prix_ht: 44490, prix_ttc: 59990 },
      { id: "benimar_yr885", marque_id: "benimar", reference: "YR885", nom: "Yrteo 885", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 710, poids_kg: 6390, prix_ht: 45990, prix_ttc: 61990 },
    ];
    for (const m of modeles) await call("modeles", m);
    console.log(`✅ ${modeles.length} modèles Benimar`);

    // 3. Options Benimar
    const options = [
      { id: "benimar_opt_moteur_160", marque_id: "benimar", nom: "Moteur FIAT 160 ch", categorie: "Motorisation", prix_ht: 1050, prix_ttc: 1490, description: "140→160 ch HDT obligatoire" },
      { id: "benimar_opt_moteur_180", marque_id: "benimar", nom: "Moteur FIAT 180 ch", categorie: "Motorisation", prix_ht: 1624, prix_ttc: 2290, description: "140→180 ch boîte auto obligatoire" },
      { id: "benimar_opt_boite_auto", marque_id: "benimar", nom: "Boîte automatique FIAT", categorie: "Motorisation", prix_ht: 2440, prix_ttc: 3390, description: "Transmission automatique" },
      { id: "benimar_opt_climatisation", marque_id: "benimar", nom: "Climatisation", categorie: "Confort", prix_ht: 1154, prix_ttc: 1690, description: "Climatisation automatique" },
      { id: "benimar_opt_four", marque_id: "benimar", nom: "Four", categorie: "Équipement", prix_ht: 334, prix_ttc: 490, description: "Four intégré" },
      { id: "benimar_opt_panneau_solaire", marque_id: "benimar", nom: "Panneau solaire supplémentaire", categorie: "Électrique", prix_ht: 334, prix_ttc: 490, description: "200W + MPPT" },
      { id: "benimar_opt_pieds_stab", marque_id: "benimar", nom: "Pieds stabilisateurs", categorie: "Équipement", prix_ht: 198, prix_ttc: 290, description: "4 pieds stabilisateurs" },
      { id: "benimar_opt_porte_velos", marque_id: "benimar", nom: "Porte-vélos à 4 rails", categorie: "Équipement", prix_ht: 334, prix_ttc: 490, description: "Arrière 4 rails" },
      { id: "benimar_opt_ambiance_madeira", marque_id: "benimar", nom: "Ambiance Madeira", categorie: "Décor", prix_ht: 660, prix_ttc: 890, description: "Finition Madeira" },
      { id: "benimar_opt_masse_max", marque_id: "benimar", nom: "Augmentation masse maximale", categorie: "Technique", prix_ht: 60, prix_ttc: 80, description: "Masse max augmentée" },
    ];
    for (const o of options) await call("options", o);
    console.log(`✅ ${options.length} options Benimar`);

    console.log("\n✨ Intégration Benimar 2027 complète !");
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }

  process.exit(0);
}

seedBenimar();
