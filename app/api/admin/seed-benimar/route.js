import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  // Vérifier que l'appelant est responsable
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profil?.role !== "RESPONSABLE") {
    return NextResponse.json({ error: "Réservé aux responsables" }, { status: 403 });
  }

  // Vérifier la clé service role
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée" },
      { status: 500 }
    );
  }

  try {
    const admin = supabaseAdmin();

    // 1. Insérer la marque
    const { error: errMarque } = await admin.from("marques").upsert({
      id: "benimar",
      nom: "Benimar",
      type_principal: "camping-car",
    });
    if (errMarque) throw new Error("Marque: " + errMarque.message);

    // 2. Insérer les modèles
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
    const { error: errModeles } = await admin.from("modeles").upsert(modeles);
    if (errModeles) throw new Error("Modèles: " + errModeles.message);

    // 3. Insérer les options
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
    const { error: errOptions } = await admin.from("options").upsert(options);
    if (errOptions) throw new Error("Options: " + errOptions.message);

    return NextResponse.json({
      success: true,
      message: `Benimar intégré : 1 marque, ${modeles.length} modèles, ${options.length} options`,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
