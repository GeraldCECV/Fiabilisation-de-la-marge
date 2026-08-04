import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const maxDuration = 60; // évite le timeout par défaut de Vercel (10s sur Hobby)

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

    // 1. Marque : on ne fixe jamais l'id, Supabase le génère. On réutilise si elle existe déjà.
    console.log("[SEED] Marque Benimar...");
    let benimarId;
    const { data: existingMarque } = await admin.from("marques").select("id").eq("nom", "Benimar").maybeSingle();
    if (existingMarque) {
      benimarId = existingMarque.id;
    } else {
      const { data: newMarque, error: errMarque } = await admin.from("marques").insert({ nom: "Benimar" }).select().single();
      if (errMarque) throw new Error("Marque: " + errMarque.message);
      benimarId = newMarque.id;
    }

    // 2. Modèles — mêmes champs que le seed Dreamer/Rapido/Adria qui fonctionne :
    // marque_id, nom, gamme, type, collection (nombre), type_carrosserie, prix_usine_ht, prix_public_ttc, actif
    // Upsert sur (marque_id, nom) pour être idempotent.
    console.log("[SEED] Insertion modèles...");
    const modelesData = [
      // MILEO
      { nom: "Mileo 262", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 53490, prix_public_ttc: 71990 },
      { nom: "Mileo 263", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 54590, prix_public_ttc: 73490 },
      { nom: "Mileo 268", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 55490, prix_public_ttc: 74490 },
      { nom: "Mileo 298", gamme: "Mileo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 55490, prix_public_ttc: 74490 },
      // AMPHITRYON
      { nom: "Amphitryon 968", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "INTEGRAL", prix_usine_ht: 62990, prix_public_ttc: 85990 },
      { nom: "Amphitryon 981", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "INTEGRAL", prix_usine_ht: 58490, prix_public_ttc: 79990 },
      { nom: "Amphitryon 998", gamme: "Amphitryon", type: "CAMPING_CAR", type_carrosserie: "INTEGRAL", prix_usine_ht: 64390, prix_public_ttc: 87490 },
      // YRTEO
      { nom: "Yrteo 841", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 45990, prix_public_ttc: 61990 },
      { nom: "Yrteo 862", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 45990, prix_public_ttc: 61990 },
      { nom: "Yrteo 881", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 44490, prix_public_ttc: 59990 },
      { nom: "Yrteo 885", gamme: "Yrteo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 45990, prix_public_ttc: 61990 },
      // TESSORO UP
      { nom: "Tessoro 440 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 47490, prix_public_ttc: 62990 },
      { nom: "Tessoro 463 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 49490, prix_public_ttc: 65990 },
      { nom: "Tessoro 495 UP", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 48490, prix_public_ttc: 65990 },
      // TESSORO Standard
      { nom: "Tessoro 425", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 49790, prix_public_ttc: 66990 },
      { nom: "Tessoro 443", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 48490, prix_public_ttc: 65490 },
      { nom: "Tessoro 444", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 49290, prix_public_ttc: 66490 },
      { nom: "Tessoro 461", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 48490, prix_public_ttc: 65490 },
      { nom: "Tessoro 463", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 49790, prix_public_ttc: 66990 },
      { nom: "Tessoro 468", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 49990, prix_public_ttc: 66490 },
      { nom: "Tessoro 481", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 46490, prix_public_ttc: 62490 },
      { nom: "Tessoro 483", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 47890, prix_public_ttc: 64490 },
      { nom: "Tessoro 488", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 48990, prix_public_ttc: 66490 },
      { nom: "Tessoro 498", gamme: "Tessoro", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 50690, prix_public_ttc: 67990 },
      // SPORT
      { nom: "Sport Capucine 325 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "CAPUCINE", prix_usine_ht: 48990, prix_public_ttc: 64990 },
      { nom: "Sport Capucine 344 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "CAPUCINE", prix_usine_ht: 49490, prix_public_ttc: 65990 },
      { nom: "Sport Capucine 363 UP", gamme: "Sport", type: "CAMPING_CAR", type_carrosserie: "CAPUCINE", prix_usine_ht: 48990, prix_public_ttc: 64990 },
      // KALEO
      { nom: "Kaleo 625", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 42990, prix_public_ttc: 55990 },
      { nom: "Kaleo 640", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 40490, prix_public_ttc: 52990 },
      { nom: "Kaleo 663", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 42990, prix_public_ttc: 56490 },
      { nom: "Kaleo 695", gamme: "Kaleo", type: "CAMPING_CAR", type_carrosserie: "PROFILE", prix_usine_ht: 42990, prix_public_ttc: 56490 },
      // BENIVAN
      { nom: "Benivan 100 UP", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 39990, prix_public_ttc: 52990 },
      { nom: "Benivan 120 UP", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 41090, prix_public_ttc: 54490 },
      { nom: "Benivan 144 UP", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 41090, prix_public_ttc: 54490 },
      { nom: "Benivan 160 UP", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 43490, prix_public_ttc: 57990 },
      { nom: "Benivan 100", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 43990, prix_public_ttc: 58990 },
      { nom: "Benivan 120", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 44990, prix_public_ttc: 60490 },
      { nom: "Benivan 144", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 44490, prix_public_ttc: 59990 },
      { nom: "Benivan 160", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 45990, prix_public_ttc: 61990 },
      { nom: "Benivan 160 Stormline", gamme: "Benivan", type: "CAMPING_CAR", type_carrosserie: "FOURGON", prix_usine_ht: 51990, prix_public_ttc: 67990 },
    ].map((m) => ({ ...m, marque_id: benimarId, collection: 2027, actif: true }));

    const { error: errModeles } = await admin.from("modeles").upsert(modelesData, { onConflict: "marque_id,nom" });
    if (errModeles) throw new Error("Modèles: " + errModeles.message);
    console.log(`[SEED] ${modelesData.length} modèles insérés en un seul appel`);

    // Récupère les vrais id générés par Supabase pour ces modèles
    const { data: modelesEnBase, error: errFetchModeles } = await admin
      .from("modeles").select("id, nom").eq("marque_id", benimarId);
    if (errFetchModeles) throw new Error("Relecture modèles: " + errFetchModeles.message);


    // 3. Options & packs — extraits du vrai tarif distributeur Benimar France 2027 (V.2 20/05/2026).
    // Chaque option porte sa propre liste de modèles compatibles (comme pour Rapido dans
    // scripts/seedData.js), avec les restrictions exactes indiquées sur le tarif.
    console.log("[SEED] Insertion options...");
    await admin.from("options").delete().eq("marque_id", benimarId);

    const MILEO = ["Mileo 262", "Mileo 263", "Mileo 268", "Mileo 298"];
    const AMPHITRYON = ["Amphitryon 968", "Amphitryon 981", "Amphitryon 998"];
    const YRTEO = ["Yrteo 841", "Yrteo 862", "Yrteo 881", "Yrteo 885"];
    const TESSORO_UP = ["Tessoro 440 UP", "Tessoro 463 UP", "Tessoro 495 UP"];
    const TESSORO_STD = ["Tessoro 425", "Tessoro 443", "Tessoro 444", "Tessoro 461", "Tessoro 463", "Tessoro 468", "Tessoro 481", "Tessoro 483", "Tessoro 488", "Tessoro 498"];
    const SPORT_UP = ["Sport Capucine 325 UP", "Sport Capucine 344 UP", "Sport Capucine 363 UP"];
    const KALEO = ["Kaleo 625", "Kaleo 640", "Kaleo 663", "Kaleo 695"];
    const BENIVAN_UP = ["Benivan 100 UP", "Benivan 120 UP", "Benivan 144 UP", "Benivan 160 UP"];
    const BENIVAN_PLUS = ["Benivan 100", "Benivan 120", "Benivan 144", "Benivan 160"];
    const BENIVAN_STORMLINE = ["Benivan 160 Stormline"];
    const BENIVAN_ALL = [...BENIVAN_UP, ...BENIVAN_PLUS, ...BENIVAN_STORMLINE];

    // designation, achat_ht, prix_ttc, poids_kg, modeles compatibles
    const OPTIONS_DEF = [
      // --- Moteurs / boîtes / châssis ---
      { designation: "Moteur FIAT 160 ch (vs 140 ch)", achat_ht: 1050, prix_ttc: 1490, poids_kg: 0, modeles: [...MILEO, ...AMPHITRYON, ...BENIVAN_PLUS] },
      { designation: "Moteur FIAT 180 ch (vs 140 ch, boîte auto obligatoire)", achat_ht: 1624, prix_ttc: 2290, poids_kg: 0, modeles: [...MILEO, ...AMPHITRYON] },
      { designation: "Boîte automatique FIAT", achat_ht: 2440, prix_ttc: 3390, poids_kg: 40, modeles: [...MILEO, ...AMPHITRYON, ...BENIVAN_PLUS] },
      { designation: "Châssis Heavy 4400 kg FIAT (réservoir 90L)", achat_ht: 1031, prix_ttc: 1490, poids_kg: 0,
        modeles: ["Mileo 263", "Mileo 268", "Mileo 298", "Amphitryon 968", "Amphitryon 998"] }, // non dispo Mileo 262 / Amphitryon 981
      { designation: "Moteur FORD 165 ch (vs 130 ch)", achat_ht: 1031, prix_ttc: 1490, poids_kg: 0, modeles: [...YRTEO, ...TESSORO_STD] },
      { designation: "Boîte automatique FORD", achat_ht: 1476, prix_ttc: 2090, poids_kg: 40, modeles: [...YRTEO, ...TESSORO_STD, ...TESSORO_UP, ...SPORT_UP] },
      { designation: "Châssis Heavy 4100 kg FORD (Pack Northautokapp obligatoire)", achat_ht: 734, prix_ttc: 990, poids_kg: 0, modeles: [...TESSORO_STD] },
      { designation: "Boîte automatique CITROËN", achat_ht: 2440, prix_ttc: 3390, poids_kg: 40, modeles: [...KALEO] },
      { designation: "Moteur Citroën 140 ch (vs 120 ch)", achat_ht: 1550, prix_ttc: 1990, poids_kg: 0,
        modeles: ["Benivan 100 UP", "Benivan 120 UP", "Benivan 144 UP"] }, // non dispo B160 UP (déjà 140cv)

      // --- Packs Mileo ---
      { designation: "PACK PLUS (Mileo)", achat_ht: 2959, prix_ttc: 3990, poids_kg: 63, modeles: [...MILEO] },
      { designation: "PACK WINTER (Mileo, Pack Plus obligatoire)", achat_ht: 808, prix_ttc: 1090, poids_kg: 15, modeles: [...MILEO] },
      { designation: "PACK NORTHAUTOKAPP (Mileo, Pack Plus obligatoire)", achat_ht: 5660, prix_ttc: 7990, poids_kg: 55, modeles: [...MILEO] },
      { designation: "NORTHAUTOKAPP ALDE (Mileo)", achat_ht: 7076, prix_ttc: 9990, poids_kg: 75, modeles: [...MILEO] },

      // --- Packs Amphitryon ---
      { designation: "PACK PLUS (Amphitryon)", achat_ht: 2518, prix_ttc: 3395, poids_kg: 63, modeles: [...AMPHITRYON] },
      { designation: "PACK WINTER (Amphitryon, Pack Plus obligatoire)", achat_ht: 1031, prix_ttc: 1490, poids_kg: 15, modeles: [...AMPHITRYON] },
      { designation: "PACK NORTHAUTOKAPP (Amphitryon, Pack Plus obligatoire)", achat_ht: 3535, prix_ttc: 4990, poids_kg: 55, modeles: [...AMPHITRYON] },
      { designation: "NORTHAUTOKAPP ALDE (Amphitryon)", achat_ht: 4951, prix_ttc: 6990, poids_kg: 75, modeles: ["Amphitryon 968"] }, // uniquement A968 avec Pack Plus

      // --- Packs Yrteo ---
      { designation: "PACK PLUS (Yrteo)", achat_ht: 2073, prix_ttc: 2795, poids_kg: 63, modeles: [...YRTEO] },
      { designation: "PACK WINTER (Yrteo, Pack Plus obligatoire)", achat_ht: 808, prix_ttc: 1090, poids_kg: 15, modeles: [...YRTEO] },
      { designation: "PACK NORTHAUTOKAPP (Yrteo, Pack Plus obligatoire)", achat_ht: 7076, prix_ttc: 9990, poids_kg: 55, modeles: [...YRTEO] },

      // --- Packs Tessoro (gamme standard) ---
      { designation: "PACK PLUS (Tessoro)", achat_ht: 2073, prix_ttc: 2795, poids_kg: 63, modeles: [...TESSORO_STD] },
      { designation: "PACK WINTER (Tessoro, Pack Plus obligatoire)", achat_ht: 808, prix_ttc: 1090, poids_kg: 15, modeles: [...TESSORO_STD] },
      { designation: "PACK NORTHAUTOKAPP (Tessoro, Pack Plus obligatoire)", achat_ht: 7076, prix_ttc: 9990, poids_kg: 55, modeles: [...TESSORO_STD] },
      { designation: "PACK STORMLINE (Tessoro, Pack Northautokapp obligatoire)", achat_ht: 750, prix_ttc: 1990, poids_kg: 0, modeles: [...TESSORO_STD] },

      // --- Packs Benivan Plus ---
      { designation: "PACK PLUS (Benivan)", achat_ht: 2959, prix_ttc: 3990, poids_kg: 50, modeles: [...BENIVAN_PLUS] },
      { designation: "PACK WINTER (Benivan, Pack Plus obligatoire)", achat_ht: 967, prix_ttc: 1290, poids_kg: 15, modeles: [...BENIVAN_PLUS] },
      { designation: "PACK TECNO (Benivan, Pack Plus obligatoire)", achat_ht: 1995, prix_ttc: 2850, poids_kg: 55, modeles: [...BENIVAN_PLUS] },
      { designation: "PACK UPGRADE (Benivan UP) : boîte auto + jantes 16'' Fiat", achat_ht: 2490, prix_ttc: 3490, poids_kg: 40, modeles: [...BENIVAN_UP] },

      // --- Packs Kaleo ---
      { designation: "PACK ONROAD (KL625)", achat_ht: 3690, prix_ttc: 4990, poids_kg: 63, modeles: ["Kaleo 625"] },
      { designation: "PACK ONROAD (KL640 / KL663 / KL695)", achat_ht: 4450, prix_ttc: 5990, poids_kg: 63, modeles: ["Kaleo 640", "Kaleo 663", "Kaleo 695"] },

      // --- Accessoires (bases FIAT/FORD : Mileo, Amphitryon, Yrteo, Tessoro standard) ---
      { designation: "Climatisation", achat_ht: 1154, prix_ttc: 1690, poids_kg: 25, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD, ...KALEO] },
      { designation: "Ambiance Madeira", achat_ht: 660, prix_ttc: 890, poids_kg: 0, modeles: [...MILEO, ...AMPHITRYON] },
      { designation: "Ambiance Manille", achat_ht: 660, prix_ttc: 890, poids_kg: 0, modeles: [...YRTEO, ...TESSORO_STD] },
      { designation: "Augmentation de la masse maximale FIAT", achat_ht: 60, prix_ttc: 80, poids_kg: 0, modeles: [...MILEO, ...AMPHITRYON] },
      { designation: "Augmentation de la masse maximale FORD", achat_ht: 60, prix_ttc: 80, poids_kg: 0, modeles: [...YRTEO, ...TESSORO_STD, ...TESSORO_UP, ...SPORT_UP] },
      { designation: "Augmentation de la masse maximale CITROËN", achat_ht: 60, prix_ttc: 80, poids_kg: 0, modeles: [...KALEO] },
      { designation: "Four", achat_ht: 334, prix_ttc: 490, poids_kg: 13, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD, "Kaleo 625", "Kaleo 640", "Kaleo 663"] }, // non dispo KL695
      { designation: "Moquette textile", achat_ht: 232, prix_ttc: 340, poids_kg: 7, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD] },
      { designation: "Panneau solaire supplémentaire", achat_ht: 334, prix_ttc: 490, poids_kg: 12, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD] },
      { designation: "Pieds stabilisateurs", achat_ht: 198, prix_ttc: 290, poids_kg: 10, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD, ...KALEO] },
      { designation: "Porte-vélos à 4 rails", achat_ht: 334, prix_ttc: 490, poids_kg: 16, modeles: [...MILEO, ...AMPHITRYON, ...YRTEO, ...TESSORO_STD] },
      { designation: "Rail de garage + fixation", achat_ht: 61, prix_ttc: 90, poids_kg: 2,
        modeles: [...YRTEO, "Tessoro 443", "Tessoro 444", "Tessoro 461", "Tessoro 463", "Tessoro 468", "Tessoro 488", "Tessoro 498"] }, // non dispo T425/T481/T483
      { designation: "Rail arrière + élastiques/caoutchoucs", achat_ht: 82, prix_ttc: 120, poids_kg: 2,
        modeles: [...YRTEO, "Tessoro 443", "Tessoro 444", "Tessoro 461", "Tessoro 463", "Tessoro 468", "Tessoro 488", "Tessoro 498"] },
      { designation: "Supplément matelas dînette", achat_ht: 198, prix_ttc: 290, poids_kg: 10, modeles: ["Mileo 263", "Tessoro 443", "Tessoro 463"] },

      // --- Auvents (Mileo / Amphitryon / Yrteo / Tessoro standard) ---
      { designation: "Auvent noir 3 m", achat_ht: 403, prix_ttc: 590, poids_kg: 27, modeles: ["Yrteo 841", "Yrteo 881", "Tessoro 481"] },
      { designation: "Auvent noir 3,5 m", achat_ht: 471, prix_ttc: 690, poids_kg: 31, modeles: ["Amphitryon 981", "Yrteo 862", "Yrteo 885", "Tessoro 483"] },
      { designation: "Auvent noir 4 m", achat_ht: 539, prix_ttc: 790, poids_kg: 35, modeles: ["Mileo 262", "Mileo 263", "Mileo 268", "Tessoro 425", "Tessoro 463", "Tessoro 488"] },
      { designation: "Auvent noir 4,5 m", achat_ht: 608, prix_ttc: 890, poids_kg: 36, modeles: ["Mileo 298", "Amphitryon 968", "Amphitryon 998", "Tessoro 444", "Tessoro 468", "Tessoro 498"] },

      // --- Options/accessoires Kaleo ---
      { designation: "Lit d'appoint en cabine", achat_ht: 247, prix_ttc: 330, poids_kg: 15, modeles: ["Kaleo 663"] },

      // --- Options/accessoires Benivan (UP + Plus + Stormline) ---
      { designation: "Option lit transversal dans le salon", achat_ht: 247, prix_ttc: 330, poids_kg: 15, modeles: [...BENIVAN_ALL] },
      { designation: "Pré-équipement électrique pour attelage", achat_ht: 225, prix_ttc: 310, poids_kg: 0, modeles: [...BENIVAN_ALL] },
      { designation: "Toit POP-UP blanc", achat_ht: 4192, prix_ttc: 5690, poids_kg: 125, modeles: [...BENIVAN_PLUS] },
      { designation: "Toit relevable noir", achat_ht: 5168, prix_ttc: 6990, poids_kg: 125, modeles: [...BENIVAN_PLUS] },
      { designation: "Winter Tent (isolation thermique pour toit POP-UP)", achat_ht: 337, prix_ttc: 450, poids_kg: 2, modeles: [...BENIVAN_PLUS] },
      { designation: "Sellerie Modena", achat_ht: 660, prix_ttc: 890, poids_kg: 0, modeles: [...BENIVAN_PLUS] },
      { designation: "Couleur carrosserie Blue Storm / Iron Grey / Artense Grey", achat_ht: 668, prix_ttc: 890, poids_kg: 0, modeles: [...BENIVAN_PLUS] },
      { designation: "Auvent Benivan 3,25 m", achat_ht: 862, prix_ttc: 1150, poids_kg: 31, modeles: ["Benivan 100"] },
      { designation: "Auvent Benivan 3,75 m", achat_ht: 893, prix_ttc: 1190, poids_kg: 35, modeles: ["Benivan 120", "Benivan 144"] },
      { designation: "Auvent Benivan 4 m", achat_ht: 915, prix_ttc: 1240, poids_kg: 36, modeles: ["Benivan 160"] },
    ];

    const optionsToInsert = OPTIONS_DEF.map(({ modeles, ...opt }) => ({ ...opt, marque_id: benimarId }));
    const { data: optionsEnBase, error: errOpt } = await admin.from("options").insert(optionsToInsert).select();
    if (errOpt) throw new Error("Options: " + errOpt.message);
    console.log(`[SEED] ${optionsEnBase.length} options/packs insérés`);

    // 4. Compatibilités — reconstruites depuis OPTIONS_DEF, en faisant correspondre chaque
    // option par sa désignation (plus sûr que de supposer un ordre de retour de Postgres).
    console.log("[SEED] Insertion compatibilités...");
    const modeleIdParNom = {};
    for (const m of modelesEnBase) modeleIdParNom[m.nom] = m.id;
    const optionIdParDesignation = {};
    for (const o of optionsEnBase) optionIdParDesignation[o.designation] = o.id;

    const modeleIds = modelesEnBase.map((m) => m.id);
    await admin.from("compatibilites").delete().in("modele_id", modeleIds);

    const compatRows = [];
    for (const optDef of OPTIONS_DEF) {
      const optionId = optionIdParDesignation[optDef.designation];
      if (!optionId) { console.warn(`[SEED] Option introuvable après insertion: ${optDef.designation}`); continue; }
      for (const nomModele of optDef.modeles) {
        const modeleId = modeleIdParNom[nomModele];
        if (!modeleId) { console.warn(`[SEED] Modèle inconnu référencé par une option: ${nomModele}`); continue; }
        compatRows.push({ modele_id: modeleId, option_id: optionId, statut: "OPTION" });
      }
    }

    const chunkSize = 500;
    for (let i = 0; i < compatRows.length; i += chunkSize) {
      const { error: errCompat } = await admin.from("compatibilites").insert(compatRows.slice(i, i + chunkSize));
      if (errCompat) throw new Error("Compatibilités: " + errCompat.message);
    }
    console.log(`[SEED] ${compatRows.length} compatibilités insérées (correspondance réelle du tarif distributeur)`);

    console.log("[SEED] ✅ Seed complété avec succès");
    return NextResponse.json({
      success: true,
      message: `✅ Benimar 2027 COMPLET : ${modelesData.length} modèles + ${optionsEnBase.length} options/packs + ${compatRows.length} compatibilités intégrés !`,
    });
  } catch (err) {
    console.error("[SEED] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
