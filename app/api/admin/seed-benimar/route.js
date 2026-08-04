import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
  if (profil?.role !== "RESPONSABLE") return NextResponse.json({ error: "Réservé aux responsables" }, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });

  try {
    const admin = supabaseAdmin();

    // 1. Marque Benimar
    await admin.from("marques").upsert({ id: "benimar", nom: "Benimar", type_principal: "camping-car" });

    // 2. TOUS LES MODÈLES BENIMAR 2027
    const modeles = [
      // MILEO (4 modèles profilés FIAT)
      { id: "benimar_mi262", marque_id: "benimar", reference: "MI262", nom: "Mileo 262", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 705, poids_kg: 5065, prix_ht: 53490, prix_ttc: 71990 },
      { id: "benimar_mi263", marque_id: "benimar", reference: "MI263", nom: "Mileo 263", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 54590, prix_ttc: 73490 },
      { id: "benimar_mi268", marque_id: "benimar", reference: "MI268", nom: "Mileo 268", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 55490, prix_ttc: 74490 },
      { id: "benimar_mi298", marque_id: "benimar", reference: "MI298", nom: "Mileo 298", categorie: "Mileo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 740, poids_kg: 7399, prix_ht: 55490, prix_ttc: 74490 },
      
      // AMPHITRYON (3 modèles intégrals FIAT)
      { id: "benimar_am968", marque_id: "benimar", reference: "AM968", nom: "Amphitryon 968", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 742, poids_kg: 7423, prix_ht: 62990, prix_ttc: 85990 },
      { id: "benimar_am981", marque_id: "benimar", reference: "AM981", nom: "Amphitryon 981", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 696, poids_kg: 5989, prix_ht: 58490, prix_ttc: 79990 },
      { id: "benimar_am998", marque_id: "benimar", reference: "AM998", nom: "Amphitryon 998", categorie: "Amphitryon", type_carrosserie: "integral", moteur_cv: 140, longueur_mm: 742, poids_kg: 7423, prix_ht: 64390, prix_ttc: 87490 },
      
      // YRTEO (4 modèles profilés FORD)
      { id: "benimar_yr841", marque_id: "benimar", reference: "YR841", nom: "Yrteo 841", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 640, poids_kg: 6390, prix_ht: 45990, prix_ttc: 61990 },
      { id: "benimar_yr862", marque_id: "benimar", reference: "YR862", nom: "Yrteo 862", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6999, prix_ht: 45990, prix_ttc: 61990 },
      { id: "benimar_yr881", marque_id: "benimar", reference: "YR881", nom: "Yrteo 881", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 650, poids_kg: 5999, prix_ht: 44490, prix_ttc: 59990 },
      { id: "benimar_yr885", marque_id: "benimar", reference: "YR885", nom: "Yrteo 885", categorie: "Yrteo", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 710, poids_kg: 6390, prix_ht: 45990, prix_ttc: 61990 },
      
      // TESSORO UP (3 modèles profilés FORD finition UP)
      { id: "benimar_t440up", marque_id: "benimar", reference: "T440UP", nom: "Tessoro 440 UP", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 165, longueur_mm: 640, poids_kg: 6341, prix_ht: 47490, prix_ttc: 62990 },
      { id: "benimar_t463up", marque_id: "benimar", reference: "T463UP", nom: "Tessoro 463 UP", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 165, longueur_mm: 710, poids_kg: 7483, prix_ht: 49490, prix_ttc: 65990 },
      { id: "benimar_t495up", marque_id: "benimar", reference: "T495UP", nom: "Tessoro 495 UP", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 165, longueur_mm: 710, poids_kg: 7049, prix_ht: 48490, prix_ttc: 65990 },
      
      // TESSORO Standard (10 modèles profilés FORD finition normale)
      { id: "benimar_t425", marque_id: "benimar", reference: "T425", nom: "Tessoro 425", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6999, prix_ht: 49790, prix_ttc: 66990 },
      { id: "benimar_t443", marque_id: "benimar", reference: "T443", nom: "Tessoro 443", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6999, prix_ht: 48490, prix_ttc: 65490 },
      { id: "benimar_t444", marque_id: "benimar", reference: "T444", nom: "Tessoro 444", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 710, poids_kg: 7433, prix_ht: 49290, prix_ttc: 66490 },
      { id: "benimar_t461", marque_id: "benimar", reference: "T461", nom: "Tessoro 461", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6999, prix_ht: 48490, prix_ttc: 65490 },
      { id: "benimar_t463", marque_id: "benimar", reference: "T463", nom: "Tessoro 463", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 740, poids_kg: 7433, prix_ht: 49790, prix_ttc: 66990 },
      { id: "benimar_t468", marque_id: "benimar", reference: "T468", nom: "Tessoro 468", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 740, poids_kg: 7433, prix_ht: 49990, prix_ttc: 66490 },
      { id: "benimar_t481", marque_id: "benimar", reference: "T481", nom: "Tessoro 481", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 650, poids_kg: 5999, prix_ht: 46490, prix_ttc: 62490 },
      { id: "benimar_t483", marque_id: "benimar", reference: "T483", nom: "Tessoro 483", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 680, poids_kg: 6599, prix_ht: 47890, prix_ttc: 64490 },
      { id: "benimar_t488", marque_id: "benimar", reference: "T488", nom: "Tessoro 488", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 710, poids_kg: 6999, prix_ht: 48990, prix_ttc: 66490 },
      { id: "benimar_t498", marque_id: "benimar", reference: "T498", nom: "Tessoro 498", categorie: "Tessoro", type_carrosserie: "profile", moteur_cv: 130, longueur_mm: 740, poids_kg: 7433, prix_ht: 50690, prix_ttc: 67990 },
      
      // SPORT/CAPUCINE (3 modèles fourgons FORD)
      { id: "benimar_s325up", marque_id: "benimar", reference: "S325UP", nom: "Sport Capucine 325 UP", categorie: "Sport", type_carrosserie: "capucine", moteur_cv: 165, longueur_mm: 640, poids_kg: 7049, prix_ht: 48990, prix_ttc: 64990 },
      { id: "benimar_s344up", marque_id: "benimar", reference: "S344UP", nom: "Sport Capucine 344 UP", categorie: "Sport", type_carrosserie: "capucine", moteur_cv: 165, longueur_mm: 710, poids_kg: 7483, prix_ht: 49490, prix_ttc: 65990 },
      { id: "benimar_s363up", marque_id: "benimar", reference: "S363UP", nom: "Sport Capucine 363 UP", categorie: "Sport", type_carrosserie: "capucine", moteur_cv: 165, longueur_mm: 710, poids_kg: 7433, prix_ht: 48990, prix_ttc: 64990 },
      
      // KALEO (4 modèles profilés CITROËN - nouvelle gamme économique)
      { id: "benimar_kl625", marque_id: "benimar", reference: "KL625", nom: "Kaleo 625", categorie: "Kaleo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 630, poids_kg: 7015, prix_ht: 42990, prix_ttc: 55990 },
      { id: "benimar_kl640", marque_id: "benimar", reference: "KL640", nom: "Kaleo 640", categorie: "Kaleo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 670, poids_kg: 6307, prix_ht: 40490, prix_ttc: 52990 },
      { id: "benimar_kl663", marque_id: "benimar", reference: "KL663", nom: "Kaleo 663", categorie: "Kaleo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 730, poids_kg: 7449, prix_ht: 42990, prix_ttc: 56490 },
      { id: "benimar_kl695", marque_id: "benimar", reference: "KL695", nom: "Kaleo 695", categorie: "Kaleo", type_carrosserie: "profile", moteur_cv: 140, longueur_mm: 730, poids_kg: 7015, prix_ht: 42990, prix_ttc: 56490 },
      
      // BENIVAN (9 modèles fourgons CITROËN/FIAT - gamme van compacts)
      { id: "benimar_b100up", marque_id: "benimar", reference: "B100UP", nom: "Benivan 100 UP", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 120, longueur_mm: 520, poids_kg: 5400, prix_ht: 39990, prix_ttc: 52990 },
      { id: "benimar_b120up", marque_id: "benimar", reference: "B120UP", nom: "Benivan 120 UP", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 120, longueur_mm: 580, poids_kg: 5990, prix_ht: 41090, prix_ttc: 54490 },
      { id: "benimar_b144up", marque_id: "benimar", reference: "B144UP", nom: "Benivan 144 UP", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 120, longueur_mm: 580, poids_kg: 5990, prix_ht: 41090, prix_ttc: 54490 },
      { id: "benimar_b160up", marque_id: "benimar", reference: "B160UP", nom: "Benivan 160 UP", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 140, longueur_mm: 630, poids_kg: 6360, prix_ht: 43490, prix_ttc: 57990 },
      { id: "benimar_b100", marque_id: "benimar", reference: "B100", nom: "Benivan 100", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 140, longueur_mm: 580, poids_kg: 5400, prix_ht: 43990, prix_ttc: 58990 },
      { id: "benimar_b120", marque_id: "benimar", reference: "B120", nom: "Benivan 120", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 140, longueur_mm: 630, poids_kg: 5990, prix_ht: 44990, prix_ttc: 60490 },
      { id: "benimar_b144", marque_id: "benimar", reference: "B144", nom: "Benivan 144", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 140, longueur_mm: 630, poids_kg: 5990, prix_ht: 44490, prix_ttc: 59990 },
      { id: "benimar_b160", marque_id: "benimar", reference: "B160", nom: "Benivan 160", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 140, longueur_mm: 680, poids_kg: 6360, prix_ht: 45990, prix_ttc: 61990 },
      { id: "benimar_b160sl", marque_id: "benimar", reference: "B160SL", nom: "Benivan 160 Stormline", categorie: "Benivan", type_carrosserie: "fourgon", moteur_cv: 160, longueur_mm: 680, poids_kg: 6360, prix_ht: 51990, prix_ttc: 67990 },
    ];
    await admin.from("modeles").upsert(modeles);

    // 3. OPTIONS (extraites des tarifs complets)
    const options = [
      // Motorisations FIAT
      { id: "benimar_opt_fiat_160", marque_id: "benimar", nom: "Moteur FIAT 160 ch", categorie: "Motorisation", prix_ht: 1050, prix_ttc: 1490, description: "140→160 ch HDT obligatoire" },
      { id: "benimar_opt_fiat_180", marque_id: "benimar", nom: "Moteur FIAT 180 ch", categorie: "Motorisation", prix_ht: 1624, prix_ttc: 2290, description: "140→180 ch boîte auto obligatoire" },
      // Motorisations FORD
      { id: "benimar_opt_ford_165", marque_id: "benimar", nom: "Moteur FORD 165 ch", categorie: "Motorisation", prix_ht: 1031, prix_ttc: 1490, description: "130→165 ch Tessoro/Yrteo" },
      // Boîtes auto
      { id: "benimar_opt_boite_auto", marque_id: "benimar", nom: "Boîte automatique", categorie: "Motorisation", prix_ht: 2440, prix_ttc: 3390, description: "Transmission automatique" },
      // Confort
      { id: "benimar_opt_climatisation", marque_id: "benimar", nom: "Climatisation", categorie: "Confort", prix_ht: 1154, prix_ttc: 1690, description: "Climatisation Truma" },
      { id: "benimar_opt_four", marque_id: "benimar", nom: "Four", categorie: "Équipement", prix_ht: 334, prix_ttc: 490, description: "Four gaz intégré" },
      // Électrique/Solar
      { id: "benimar_opt_panneau_solaire", marque_id: "benimar", nom: "Panneau solaire 200W", categorie: "Électrique", prix_ht: 334, prix_ttc: 490, description: "Panneau solaire + MPPT" },
      // Équipement
      { id: "benimar_opt_pieds_stab", marque_id: "benimar", nom: "Pieds stabilisateurs", categorie: "Équipement", prix_ht: 198, prix_ttc: 290, description: "4 pieds manuels arrière" },
      { id: "benimar_opt_porte_velos", marque_id: "benimar", nom: "Porte-vélos 4 rails", categorie: "Équipement", prix_ht: 334, prix_ttc: 490, description: "Porte-vélos arrière 4 vélos" },
    ];
    await admin.from("options").upsert(options);

    return NextResponse.json({
      success: true,
      message: `✅ Benimar 2027 COMPLET : ${modeles.length} modèles + ${options.length} options intégrés !`,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
