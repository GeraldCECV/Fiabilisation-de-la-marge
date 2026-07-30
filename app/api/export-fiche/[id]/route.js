import ExcelJS from "exceljs";
import path from "path";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Traduit l'écart de collection vers les tranches reconnues par les formules du gabarit
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

  const templatePath = path.join(process.cwd(), "lib", "templates", "trame_renta_template.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  workbook.calcProperties.fullCalcOnLoad = true; // force Excel à recalculer toutes les formules à l'ouverture

  const ws = workbook.getWorksheet("RENTA VN");

  const modele = dossier.modeles;
  const isCC = modele?.type === "CAMPING_CAR";
  const diffEcart = ANNEE_COURANTE - Number(modele?.collection || ANNEE_COURANTE);

  // Bloc informations
  ws.getCell("C5").value = new Date(dossier.created_at);
  ws.getCell("C6").value = dossier.client_nom || "";
  ws.getCell("C7").value = dossier.utilisateurs?.nom || "";

  // Type de véhicule / exposition
  ws.getCell("G4").value = isCC ? "CAMPING CAR" : "CARAVANE";
  ws.getCell("G7").value = EXPO_LABELS[dossier.expo] || "PAS D'EXPO";

  // Véhicule
  ws.getCell("C11").value = modele?.marques?.nom || "";
  ws.getCell("C12").value = modele?.nom || "";
  ws.getCell("C13").value = valeurCollectionGabarit(modele?.type, diffEcart);
  ws.getCell("C14").value = dossier.stock_statut || "STOCK";
  if (dossier.numero_chassis) {
    ws.getCell("C15").value = dossier.numero_chassis;
  }

  ws.getCell("E19").value = Number(modele?.prix_usine_ht || 0);
  ws.getCell("E20").value = Number(dossier.frais_sortie_usine || 0);
  ws.getCell("E21").value = Number(dossier.transport_usine || 0);
  ws.getCell("E22").value = Number(dossier.cession_odoo || 0);
  ws.getCell("E23").value = Number(dossier.transport_intersite || 0);
  ws.getCell("E24").value = Number(modele?.prix_public_ttc || 0);
  ws.getCell("E26").value = Number(dossier.prix_negocie_ttc || 0);

  // Options usine (jusqu'à 15 lignes, lignes 12 à 26)
  options.slice(0, 15).forEach((o, i) => {
    const row = 12 + i;
    ws.getCell(`G${row}`).value = o.designation;
    ws.getCell(`I${row}`).value = Number(o.achat_ht || 0);
    ws.getCell(`J${row}`).value = Number(o.cession_pose || 0);
    ws.getCell(`K${row}`).value = Number(o.prix_ttc || 0);
  });

  // Batterie
  if (dossier.batterie_choix) {
    ws.getCell("G33").value = dossier.batterie_choix;
  }

  // Financement
  ws.getCell("E38").value = dossier.financement_montant > 0 ? "OUI" : "NON";
  ws.getCell("E39").value = dossier.financement_organisme || "";
  ws.getCell("E40").value = Number(dossier.financement_montant || 0);

  // Rachat
  ws.getCell("E43").value = dossier.rachat_actif ? "OUI" : "NON";
  ws.getCell("E44").value = Number(dossier.rachat_montant || 0);

  // Prix affiché parc
  ws.getCell("E45").value = Number(dossier.prix_affiche_parc || 0);

  // Bon de préparation / commentaires
  if (dossier.commentaires) {
    ws.getCell("B49").value = dossier.commentaires;
  }

  const buffer = await workbook.xlsx.writeBuffer();
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
