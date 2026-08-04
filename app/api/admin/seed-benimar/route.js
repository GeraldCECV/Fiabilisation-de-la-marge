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

    // 3. Options — même schéma que le seed qui fonctionne : marque_id, designation, achat_ht, prix_ttc
    console.log("[SEED] Insertion options...");
    // On repart de zéro pour les options Benimar (pas de contrainte FK stricte dessus)
    await admin.from("options").delete().eq("marque_id", benimarId);

    const options = [
      { marque_id: benimarId, designation: "Moteur FIAT 160 ch", achat_ht: 1050, prix_ttc: 1490 },
      { marque_id: benimarId, designation: "Moteur FIAT 180 ch", achat_ht: 1624, prix_ttc: 2290 },
      { marque_id: benimarId, designation: "Moteur FORD 165 ch", achat_ht: 1031, prix_ttc: 1490 },
      { marque_id: benimarId, designation: "Boîte automatique", achat_ht: 2440, prix_ttc: 3390 },
      { marque_id: benimarId, designation: "Climatisation", achat_ht: 1154, prix_ttc: 1690 },
      { marque_id: benimarId, designation: "Four", achat_ht: 334, prix_ttc: 490 },
      { marque_id: benimarId, designation: "Panneau solaire 200W", achat_ht: 334, prix_ttc: 490 },
      { marque_id: benimarId, designation: "Pieds stabilisateurs", achat_ht: 198, prix_ttc: 290 },
      { marque_id: benimarId, designation: "Porte-vélos 4 rails", achat_ht: 334, prix_ttc: 490 },
    ];

    const { data: optionsEnBase, error: errOpt } = await admin.from("options").insert(options).select();
    if (errOpt) throw new Error("Options: " + errOpt.message);

    // 4. Compatibilités — sans ligne ici, le Calculateur n'affiche AUCUNE option pour le modèle
    // (voir schema.sql : "Une ligne absente = indisponible"). Correspondance construite à partir
    // du dossier technique Benimar 2027 (p.122-126 : tableau des bases moteur et poids des options).
    console.log("[SEED] Insertion compatibilités...");

    // Base FIAT 140cv (Amphitryon, Mileo) + Benivan variantes FIAT (100/120/144/160/160SL)
    const MODELES_FIAT = [
      "Amphitryon 968", "Amphitryon 981", "Amphitryon 998",
      "Mileo 262", "Mileo 263", "Mileo 268", "Mileo 298",
      "Benivan 100", "Benivan 120", "Benivan 144", "Benivan 160", "Benivan 160 Stormline",
    ];
    // Base FORD 130cv (éligibles à l'upgrade Moteur FORD 165ch) : Tessoro Standard + Yrteo
    // (Tessoro UP et Sport sont déjà en FORD 165cv de série, donc exclus de cette option)
    const MODELES_FORD_130 = [
      "Tessoro 425", "Tessoro 443", "Tessoro 444", "Tessoro 461", "Tessoro 463",
      "Tessoro 468", "Tessoro 481", "Tessoro 483", "Tessoro 488", "Tessoro 498",
      "Yrteo 841", "Yrteo 862", "Yrteo 881", "Yrteo 885",
    ];
    // Accessoires universels sans restriction de base moteur (climatisation, four, panneau
    // solaire, pieds stabilisateurs, porte-vélos, boîte automatique disponible sur chaque base)
    const OPTIONS_UNIVERSELLES = [
      "Boîte automatique", "Climatisation", "Four", "Panneau solaire 200W",
      "Pieds stabilisateurs", "Porte-vélos 4 rails",
    ];

    const modeleIds = modelesEnBase.map((m) => m.id);
    await admin.from("compatibilites").delete().in("modele_id", modeleIds);

    const compatRows = [];
    for (const modele of modelesEnBase) {
      for (const opt of optionsEnBase) {
        let applicable = false;
        if (OPTIONS_UNIVERSELLES.includes(opt.designation)) {
          applicable = true;
        } else if (opt.designation === "Moteur FIAT 160 ch" || opt.designation === "Moteur FIAT 180 ch") {
          applicable = MODELES_FIAT.includes(modele.nom);
        } else if (opt.designation === "Moteur FORD 165 ch") {
          applicable = MODELES_FORD_130.includes(modele.nom);
        }
        if (applicable) compatRows.push({ modele_id: modele.id, option_id: opt.id, statut: "OPTION" });
      }
    }
    const chunkSize = 500;
    for (let i = 0; i < compatRows.length; i += chunkSize) {
      const { error: errCompat } = await admin.from("compatibilites").insert(compatRows.slice(i, i + chunkSize));
      if (errCompat) throw new Error("Compatibilités: " + errCompat.message);
    }
    console.log(`[SEED] ${compatRows.length} compatibilités insérées (correspondance réelle par base moteur)`);

    console.log("[SEED] ✅ Seed complété avec succès");
    return NextResponse.json({
      success: true,
      message: `✅ Benimar 2027 COMPLET : ${modelesData.length} modèles + ${options.length} options + ${compatRows.length} compatibilités intégrés !`,
    });
  } catch (err) {
    console.error("[SEED] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
