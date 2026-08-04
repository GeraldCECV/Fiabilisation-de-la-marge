import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    console.log("[SEED] Début du seed Benimar");
    const supabase = supabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
    if (profil?.role !== "RESPONSABLE") return NextResponse.json({ error: "Réservé aux responsables" }, { status: 403 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });

    const admin = supabaseAdmin();

    // Fonction pour générer un UUID déterministe basé sur un string
    const generateUUID = (namespace) => {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        const char = namespace.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      const uuid = `${Math.abs(hash).toString(16).padStart(8, '0')}-${Math.abs(hash * 31).toString(16).padStart(4, '0')}-${Math.abs(hash * 17).toString(16).padStart(4, '0')}-${Math.abs(hash * 7).toString(16).padStart(4, '0')}-${Math.abs(hash * 13).toString(16).padStart(12, '0')}`;
      return uuid;
    };

    // 1. Marque
    console.log("[SEED] Insertion marque...");
    await admin.from("marques").upsert({ id: "benimar", nom: "Benimar", type_principal: "camping-car" });

    // 2. Modèles (en batch de 5)
    console.log("[SEED] Insertion modèles...");
    const modeles = [
      // MILEO
      { id: generateUUID("benimar_mi262"), marque_id: "benimar", nom: "Mileo 262", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 53490, prix_public_ttc: 71990, actif: true },
      { id: generateUUID("benimar_mi263"), marque_id: "benimar", nom: "Mileo 263", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 54590, prix_public_ttc: 73490, actif: true },
      { id: generateUUID("benimar_mi268"), marque_id: "benimar", nom: "Mileo 268", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 55490, prix_public_ttc: 74490, actif: true },
      { id: generateUUID("benimar_mi298"), marque_id: "benimar", nom: "Mileo 298", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 55490, prix_public_ttc: 74490, actif: true },
      // AMPHITRYON
      { id: generateUUID("benimar_am968"), marque_id: "benimar", nom: "Amphitryon 968", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "integral", prix_usine_ht: 62990, prix_public_ttc: 85990, actif: true },
      { id: generateUUID("benimar_am981"), marque_id: "benimar", nom: "Amphitryon 981", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "integral", prix_usine_ht: 58490, prix_public_ttc: 79990, actif: true },
      { id: generateUUID("benimar_am998"), marque_id: "benimar", nom: "Amphitryon 998", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "integral", prix_usine_ht: 64390, prix_public_ttc: 87490, actif: true },
      // YRTEO
      { id: generateUUID("benimar_yr841"), marque_id: "benimar", nom: "Yrteo 841", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 45990, prix_public_ttc: 61990, actif: true },
      { id: generateUUID("benimar_yr862"), marque_id: "benimar", nom: "Yrteo 862", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 45990, prix_public_ttc: 61990, actif: true },
      { id: generateUUID("benimar_yr881"), marque_id: "benimar", nom: "Yrteo 881", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 44490, prix_public_ttc: 59990, actif: true },
      { id: generateUUID("benimar_yr885"), marque_id: "benimar", nom: "Yrteo 885", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 45990, prix_public_ttc: 61990, actif: true },
      // TESSORO UP
      { id: generateUUID("benimar_t440up"), marque_id: "benimar", nom: "Tessoro 440 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 47490, prix_public_ttc: 62990, actif: true },
      { id: generateUUID("benimar_t463up"), marque_id: "benimar", nom: "Tessoro 463 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 49490, prix_public_ttc: 65990, actif: true },
      { id: generateUUID("benimar_t495up"), marque_id: "benimar", nom: "Tessoro 495 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 48490, prix_public_ttc: 65990, actif: true },
      // TESSORO Standard
      { id: generateUUID("benimar_t425"), marque_id: "benimar", nom: "Tessoro 425", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 49790, prix_public_ttc: 66990, actif: true },
      { id: generateUUID("benimar_t443"), marque_id: "benimar", nom: "Tessoro 443", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 48490, prix_public_ttc: 65490, actif: true },
      { id: generateUUID("benimar_t444"), marque_id: "benimar", nom: "Tessoro 444", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 49290, prix_public_ttc: 66490, actif: true },
      { id: generateUUID("benimar_t461"), marque_id: "benimar", nom: "Tessoro 461", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 48490, prix_public_ttc: 65490, actif: true },
      { id: generateUUID("benimar_t463"), marque_id: "benimar", nom: "Tessoro 463", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 49790, prix_public_ttc: 66990, actif: true },
      { id: generateUUID("benimar_t468"), marque_id: "benimar", nom: "Tessoro 468", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 49990, prix_public_ttc: 66490, actif: true },
      { id: generateUUID("benimar_t481"), marque_id: "benimar", nom: "Tessoro 481", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 46490, prix_public_ttc: 62490, actif: true },
      { id: generateUUID("benimar_t483"), marque_id: "benimar", nom: "Tessoro 483", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 47890, prix_public_ttc: 64490, actif: true },
      { id: generateUUID("benimar_t488"), marque_id: "benimar", nom: "Tessoro 488", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 48990, prix_public_ttc: 66490, actif: true },
      { id: generateUUID("benimar_t498"), marque_id: "benimar", nom: "Tessoro 498", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 50690, prix_public_ttc: 67990, actif: true },
      // SPORT
      { id: generateUUID("benimar_s325up"), marque_id: "benimar", nom: "Sport Capucine 325 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "capucine", prix_usine_ht: 48990, prix_public_ttc: 64990, actif: true },
      { id: generateUUID("benimar_s344up"), marque_id: "benimar", nom: "Sport Capucine 344 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "capucine", prix_usine_ht: 49490, prix_public_ttc: 65990, actif: true },
      { id: generateUUID("benimar_s363up"), marque_id: "benimar", nom: "Sport Capucine 363 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "capucine", prix_usine_ht: 48990, prix_public_ttc: 64990, actif: true },
      // KALEO
      { id: generateUUID("benimar_kl625"), marque_id: "benimar", nom: "Kaleo 625", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 42990, prix_public_ttc: 55990, actif: true },
      { id: generateUUID("benimar_kl640"), marque_id: "benimar", nom: "Kaleo 640", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 40490, prix_public_ttc: 52990, actif: true },
      { id: generateUUID("benimar_kl663"), marque_id: "benimar", nom: "Kaleo 663", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 42990, prix_public_ttc: 56490, actif: true },
      { id: generateUUID("benimar_kl695"), marque_id: "benimar", nom: "Kaleo 695", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "profile", prix_usine_ht: 42990, prix_public_ttc: 56490, actif: true },
      // BENIVAN
      { id: generateUUID("benimar_b100up"), marque_id: "benimar", nom: "Benivan 100 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 39990, prix_public_ttc: 52990, actif: true },
      { id: generateUUID("benimar_b120up"), marque_id: "benimar", nom: "Benivan 120 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 41090, prix_public_ttc: 54490, actif: true },
      { id: generateUUID("benimar_b144up"), marque_id: "benimar", nom: "Benivan 144 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 41090, prix_public_ttc: 54490, actif: true },
      { id: generateUUID("benimar_b160up"), marque_id: "benimar", nom: "Benivan 160 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 43490, prix_public_ttc: 57990, actif: true },
      { id: generateUUID("benimar_b100"), marque_id: "benimar", nom: "Benivan 100", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 43990, prix_public_ttc: 58990, actif: true },
      { id: generateUUID("benimar_b120"), marque_id: "benimar", nom: "Benivan 120", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 44990, prix_public_ttc: 60490, actif: true },
      { id: generateUUID("benimar_b144"), marque_id: "benimar", nom: "Benivan 144", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 44490, prix_public_ttc: 59990, actif: true },
      { id: generateUUID("benimar_b160"), marque_id: "benimar", nom: "Benivan 160", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 45990, prix_public_ttc: 61990, actif: true },
      { id: generateUUID("benimar_b160sl"), marque_id: "benimar", nom: "Benivan 160 Stormline", gamme: "Benivan", type: "FOURGON", type_carrosserie: "fourgon", prix_usine_ht: 51990, prix_public_ttc: 67990, actif: true },
    ];
    
    // Insérer par batch de 5
    for (let i = 0; i < modeles.length; i += 5) {
      const batch = modeles.slice(i, i + 5);
      const { error } = await admin.from("modeles").upsert(batch);
      if (error) throw new Error(`Modèles batch ${i}: ${error.message}`);
      console.log(`[SEED] Inserted modèles ${i} à ${Math.min(i + 5, modeles.length)}`);
    }

    // 3. Options
    console.log("[SEED] Insertion options...");
    const options = [
      { id: generateUUID("benimar_opt_fiat_160"), marque_id: "benimar", designation: "Moteur FIAT 160 ch", achat_ht: 1050, prix_ttc: 1490 },
      { id: generateUUID("benimar_opt_fiat_180"), marque_id: "benimar", designation: "Moteur FIAT 180 ch", achat_ht: 1624, prix_ttc: 2290 },
      { id: generateUUID("benimar_opt_ford_165"), marque_id: "benimar", designation: "Moteur FORD 165 ch", achat_ht: 1031, prix_ttc: 1490 },
      { id: generateUUID("benimar_opt_boite_auto"), marque_id: "benimar", designation: "Boîte automatique", achat_ht: 2440, prix_ttc: 3390 },
      { id: generateUUID("benimar_opt_climatisation"), marque_id: "benimar", designation: "Climatisation", achat_ht: 1154, prix_ttc: 1690 },
      { id: generateUUID("benimar_opt_four"), marque_id: "benimar", designation: "Four", achat_ht: 334, prix_ttc: 490 },
      { id: generateUUID("benimar_opt_panneau_solaire"), marque_id: "benimar", designation: "Panneau solaire 200W", achat_ht: 334, prix_ttc: 490 },
      { id: generateUUID("benimar_opt_pieds_stab"), marque_id: "benimar", designation: "Pieds stabilisateurs", achat_ht: 198, prix_ttc: 290 },
      { id: generateUUID("benimar_opt_porte_velos"), marque_id: "benimar", designation: "Porte-vélos 4 rails", achat_ht: 334, prix_ttc: 490 },
    ];
    
    const { error: errOpt } = await admin.from("options").upsert(options);
    if (errOpt) throw new Error("Options: " + errOpt.message);

    console.log("[SEED] ✅ Seed complété avec succès");
    return NextResponse.json({
      success: true,
      message: `✅ Benimar 2027 COMPLET : ${modeles.length} modèles + ${options.length} options intégrés !`,
    });
  } catch (err) {
    console.error("[SEED] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
