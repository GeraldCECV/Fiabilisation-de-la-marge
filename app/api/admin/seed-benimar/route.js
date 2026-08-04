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
      { nom: "Benivan 100 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 39990, prix_public_ttc: 52990 },
      { nom: "Benivan 120 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 41090, prix_public_ttc: 54490 },
      { nom: "Benivan 144 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 41090, prix_public_ttc: 54490 },
      { nom: "Benivan 160 UP", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 43490, prix_public_ttc: 57990 },
      { nom: "Benivan 100", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 43990, prix_public_ttc: 58990 },
      { nom: "Benivan 120", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 44990, prix_public_ttc: 60490 },
      { nom: "Benivan 144", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 44490, prix_public_ttc: 59990 },
      { nom: "Benivan 160", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 45990, prix_public_ttc: 61990 },
      { nom: "Benivan 160 Stormline", gamme: "Benivan", type: "FOURGON", type_carrosserie: "FOURGON", prix_usine_ht: 51990, prix_public_ttc: 67990 },
    ].map((m) => ({ ...m, marque_id: benimarId, collection: 2027, actif: true }));

    for (let i = 0; i < modelesData.length; i += 5) {
      const batch = modelesData.slice(i, i + 5);
      const { error } = await admin.from("modeles").upsert(batch, { onConflict: "marque_id,nom" });
      if (error) throw new Error(`Modèles batch ${i}: ${error.message}`);
      console.log(`[SEED] Inserted modèles ${i} à ${Math.min(i + 5, modelesData.length)}`);
    }

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

    const { error: errOpt } = await admin.from("options").insert(options);
    if (errOpt) throw new Error("Options: " + errOpt.message);

    console.log("[SEED] ✅ Seed complété avec succès");
    return NextResponse.json({
      success: true,
      message: `✅ Benimar 2027 COMPLET : ${modelesData.length} modèles + ${options.length} options intégrés !`,
    });
  } catch (err) {
    console.error("[SEED] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
