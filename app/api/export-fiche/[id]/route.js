import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fillTemplate } from "@/lib/xlsxPatch";

// Traduit l'écart de collection vers les tranches reconnues par la formule du gabarit
// (2027 = collection en cours -> 12%/14%, N-1 -> 11%/12%, N-2 -> 8%/10%, au-delà -> déstockage).
function valeurCollectionGabarit(type, diffEcart) {
  if (type === "CAMPING_CAR") {
    if (diffEcart <= 0) return 2027;
    if (diffEcart === 1) return 2026;
    if (diffEcart === 2) return 2025;
    return "2024 & <";
  }
  if (diffEcart <= 0) return 2026;
  if (diffEcart === 1) return 2025;
  if (diffEcart === 2) return 2024;
  return "2023 & <";
}

const EXPO_LABELS = {
  PAS_EXPO: "PAS D'EXPO",
  EXPO_ANNEE: "EXPO DE L'ANNEE (OU CARAVANE)",
  EXPO_1_AN: "EXPO 1 AN",
  EXPO_2_ANS: "EXPO 2 ANS",
};

const ANNEE_COURANTE = 2027;

// Convertit une date JS en numéro de série Excel (jours depuis le 30/12/1899).
function excelDateSerial(date) {
  const epoch = Date.UTC(1899, 11, 30);
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - epoch) / 86400000);
}

const num = (value) => ({ type: "number", value });
const str = (value) => ({ type: "string", value });

export async function GET(request, { params }) {
  const supabase = supabaseServer();

  const { data: dossier } = await supabase
    .from("dossiers_vente")
    .select("*, modeles ( nom, gamme, type, collection, prix_usine_ht, prix_public_ttc, marques ( nom ) ), utilisateurs ( nom )")
    .eq("id", params.id)
    .single();

  if (!dossier) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  let options = [];
  if (dossier.options_choisies?.length) {
    const { data } = await supabase
      .from("options")
      .select("id, designation, achat_ht, cession_pose, prix_ttc")
      .in("id", dossier.options_choisies);
    options = data || [];
  }

  let equipementsYpocamp = [];
  if (dossier.equipements_ypocamp_choisis?.length) {
    const { data } = await supabase
      .from("equipements_ypocamp")
      .select("id, designation, achat_ht, pose_ventilee_ht, prix_ttc")
      .in("id", dossier.equipements_ypocamp_choisis);
    equipementsYpocamp = data || [];
  }

  const templatePath = path.join(process.cwd(), "public", "templates", "trame_renta_template.xlsx");
  const templateBuffer = await fs.readFile(templatePath);

  const modele = dossier.modeles;
  const isCC = modele?.type === "CAMPING_CAR";
  const diffEcart = ANNEE_COURANTE - Number(modele?.collection || ANNEE_COURANTE);

  const values = {
    // Bloc informations
    C4: num(excelDateSerial(new Date(dossier.created_at))), // date de commande = date de création du dossier (proposition)
    C5: num(excelDateSerial(new Date())), // date de la trame = date de génération de ce document
    C6: str(dossier.client_nom || ""),
    C7: str(dossier.utilisateurs?.nom || ""),

    // Type de véhicule / exposition
    G4: str(isCC ? "CAMPING CAR" : "CARAVANE"),
    G7: str(EXPO_LABELS[dossier.expo] || "PAS D'EXPO"),

    // Véhicule
    C11: str(modele?.marques?.nom || ""),
    C12: str(modele?.nom || ""),
    C13: typeof valeurCollectionGabarit(modele?.type, diffEcart) === "number"
      ? num(valeurCollectionGabarit(modele?.type, diffEcart))
      : str(valeurCollectionGabarit(modele?.type, diffEcart)),
    C14: str(dossier.stock_statut || "STOCK"),

    E19: num(modele?.prix_usine_ht || 0),
    E20: num(dossier.frais_sortie_usine || 0),
    E21: num(dossier.transport_usine || 0),
    E22: num(dossier.cession_odoo || 0),
    E23: num(dossier.transport_intersite || 0),
    E24: num(modele?.prix_public_ttc || 0),
    E26: num(dossier.prix_negocie_ttc || 0),

    // Financement
    E38: str(dossier.financement_montant > 0 ? "OUI" : "NON"),
    E39: str(dossier.financement_organisme || ""),
    E40: num(dossier.financement_montant || 0),

    // Rachat
    E43: str(dossier.rachat_actif ? "OUI" : "NON"),
    E44: num(dossier.rachat_montant || 0),
    E45: num(dossier.prix_affiche_parc || 0),
  };

  if (dossier.numero_chassis) values.C15 = str(dossier.numero_chassis);
  if (dossier.batterie_choix) values.G33 = str(dossier.batterie_choix);
  if (dossier.commentaires) values.B49 = str(dossier.commentaires);

  // Options usine (jusqu'à 15 lignes, lignes 12 à 26)
  // Hymer : catalogue d'options trop volumineux, une seule ligne saisie manuellement en TTC
  // (HT = TTC / 1,2 * 0,83, pas de cession pose séparée)
  if (dossier.options_hymer_ttc !== null && dossier.options_hymer_ttc !== undefined) {
    const ttc = Number(dossier.options_hymer_ttc) || 0;
    values.G12 = str("Options usine selon configuration");
    values.I12 = num((ttc / 1.2) * 0.83);
    values.J12 = num(0);
    values.K12 = num(ttc);
  } else {
    options.slice(0, 15).forEach((o, i) => {
      const row = 12 + i;
      values[`G${row}`] = str(o.designation);
      values[`I${row}`] = num(o.achat_ht || 0);
      values[`J${row}`] = num(o.cession_pose || 0);
      values[`K${row}`] = num(o.prix_ttc || 0);
    });
  }

  // Équipements Ypocamp / Top Accessoires (jusqu'à 9 lignes, lignes 36 à 44 — suite du bloc
  // "PREPARATION YPOCAMP / TOP ACCESSOIRES / SOUS-TRAITANT" dont le total ligne 45 est déjà
  // intégré aux formules de marge du gabarit)
  equipementsYpocamp.slice(0, 9).forEach((e, i) => {
    const row = 36 + i;
    values[`G${row}`] = str(e.designation);
    values[`I${row}`] = num(e.achat_ht || 0);
    values[`J${row}`] = num(e.pose_ventilee_ht || 0);
    values[`K${row}`] = num(e.prix_ttc || 0);
  });

  const buffer = await fillTemplate(templateBuffer, "RENTA VN", values);

  const mois = String(new Date().getMonth() + 1).padStart(2, "0");
  const nomClient = (dossier.client_nom || "client").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const nomFichier = `(${mois}) ${nomClient || "CLIENT"}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
