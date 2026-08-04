// Moteur de calcul de marge VN — logique complète reprise de la trame RENTA VN,
// corrigée (comparaisons de type normalisées, exception de remise 590/380 supprimée).

export function tauxCible(baremes, type, collectionVehicule, anneeCourante) {
  const diff = anneeCourante - collectionVehicule;
  const ligne = baremes.find((b) => b.type === type && b.annees_ecart === Math.min(diff, 3));
  return ligne ? ligne.taux : null; // null = déstockage
}

function f(forfaits, cle, defaut = 0) {
  const item = forfaits.find((x) => x.cle === cle);
  return item ? Number(item.valeur) : defaut;
}

const EXPO_COUTS = {
  PAS_EXPO: { I32: 0, J32: 0 },
  EXPO_ANNEE: { I32: 0, J32: 50 },
  EXPO_1_AN: { I32: 50, J32: 100 },
  EXPO_2_ANS: { I32: 342, J32: 200 },
};

export const BATTERIE_COUTS = {
  "Camping car avec batterie": { achatHt: 0, cessionPose: 0, prixTtc: 0 },
  "Batterie gel 105Ah": { achatHt: 192, cessionPose: 50, prixTtc: 390 },
  "Pack 2 batteries gel 105Ah (incluant cosses et câblage supplémentaires)": { achatHt: 384, cessionPose: 150, prixTtc: 890 },
};

/**
 * @param modele { type, collection, prix_usine_ht, prix_public_ttc }
 * @param optionsChoisies [{ achat_ht, cession_pose, prix_ttc }]
 * @param equipementsYpocampChoisies [{ achat_ht, pose_ventilee_ht, prix_ttc }] (max 9, bloc "PREPARATION
 *   YPOCAMP / TOP ACCESSOIRES" lignes 36 à 44 du gabarit — même total ligne 45 que la provision SAV,
 *   l'exposition et la batterie)
 * @param fraisAnnexes { fraisSortieUsine, transportUsine, cessionOdoo, transportIntersite }
 * @param expo 'PAS_EXPO' | 'EXPO_ANNEE' | 'EXPO_1_AN' | 'EXPO_2_ANS'
 * @param financement { actif, montant }
 */
export function calculerMarge({ modele, optionsChoisies, equipementsYpocampChoisies = [], baremes, forfaits, prixNegocieTtc, financement, anneeCourante, fraisAnnexes = {}, expo = "PAS_EXPO", batterieChoix }) {
  const isCC = modele.type === "CAMPING_CAR";

  const I4 = isCC ? f(forfaits, "admin_cc", 135) : f(forfaits, "admin_caravane", 20);
  const I7 = isCC ? f(forfaits, "atelier_cc", 200) : f(forfaits, "atelier_caravane", 150);
  const carteGrise = isCC ? f(forfaits, "carte_grise_cc", 790) : f(forfaits, "carte_grise_caravane", 380);
  const provisionSav = isCC ? f(forfaits, "provision_sav_cc", 600) : 0;

  const I27 = optionsChoisies.reduce((s, o) => s + Number(o.achat_ht || 0), 0);
  const J27 = optionsChoisies.reduce((s, o) => s + Number(o.cession_pose || 0), 0);
  const K27 = optionsChoisies.reduce((s, o) => s + Number(o.prix_ttc || 0), 0);

  const { I32, J32 } = EXPO_COUTS[expo] || EXPO_COUTS.PAS_EXPO;
  const batterie = BATTERIE_COUTS[batterieChoix] || BATTERIE_COUTS["Camping car avec batterie"];

  // Lignes 36-44 du gabarit (équipements Ypocamp / Top Accessoires)
  const equipements = equipementsYpocampChoisies.slice(0, 9);
  const I36_44 = equipements.reduce((s, e) => s + Number(e.achat_ht || 0), 0);
  const J36_44 = equipements.reduce((s, e) => s + Number(e.pose_ventilee_ht || 0), 0);
  const K36_44 = equipements.reduce((s, e) => s + Number(e.prix_ttc || 0), 0);

  const I45 = provisionSav + I32 + batterie.achatHt + I36_44;
  const J45 = J32 + batterie.cessionPose + J36_44;
  const K45 = batterie.prixTtc + K36_44;

  const E19 = Number(modele.prix_usine_ht);
  const E20 = Number(fraisAnnexes.fraisSortieUsine || 0);
  const E21 = Number(fraisAnnexes.transportUsine || 0);
  const E22 = Number(fraisAnnexes.cessionOdoo || 0);
  const E23 = Number(fraisAnnexes.transportIntersite || 0);

  const sommeCouts = E19 + E20 + E21 + E22 + E23 + I4 + I7 + I27 + J27 + I45 + J45;

  const E24 = Number(modele.prix_public_ttc);
  const E25 = E24 + K27 + K45 + carteGrise;
  const E27 = E25 - prixNegocieTtc;
  const D27 = E25 ? E27 / E25 : 0;

  const D28 = tauxCible(baremes, modele.type, modele.collection, anneeCourante);
  const destockage = D28 === null || D28 === undefined;

  const partFinancementAttendue = f(forfaits, "part_financement_attendue", 0.3);
  const tauxFinancement = f(forfaits, "taux_financement", 0.06);

  const E28 = destockage ? null : (sommeCouts / (1 - D28)) * 1.2;
  const E30 = destockage ? null : E28 / 1.2 - sommeCouts;
  const E31 = E25 * partFinancementAttendue * tauxFinancement;
  const E29 = destockage ? null : E30 + E31;

  const E34 = prixNegocieTtc / 1.2 - sommeCouts;
  const E35 = financement?.actif ? Number(financement.montant || 0) * tauxFinancement : 0;
  const E33 = E34 + E35;
  const D34 = prixNegocieTtc ? E34 / (prixNegocieTtc / 1.2) : 0;

  const commission = E35 === 0 ? E34 * 0.09 : E34 * 0.11 + Number(financement?.montant || 0) * 0.003;

  return {
    I4, I7, carteGrise, provisionSav, I27, J27, K27, I45, J45, K45, I36_44, J36_44, K36_44, sommeCouts,
    E19, E20, E21, E22, E23,
    E24, E25, E27, D27, D28, destockage, E28, E29, E30, E31,
    E33, E34, E35, D34, commission,
  };
}
