// Moteur de calcul de marge VN — logique reprise de la trame RENTA VN,
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

/**
 * @param {object} params
 * @param modele { type, collection, prix_usine_ht, prix_public_ttc }
 * @param optionsChoisies [{ achat_ht, cession_pose, prix_ttc }]
 * @param baremes liste des barèmes de marge (table baremes_marge)
 * @param forfaits liste des forfaits fixes (table forfaits_fixes)
 * @param prixNegocieTtc prix TTC négocié (hors carte grise)
 * @param financement { actif, montant }
 * @param anneeCourante année de la collection en cours (ex: 2027)
 */
export function calculerMarge({ modele, optionsChoisies, baremes, forfaits, prixNegocieTtc, financement, anneeCourante }) {
  const isCC = modele.type === "CAMPING_CAR";

  const I4 = isCC ? f(forfaits, "admin_cc", 135) : f(forfaits, "admin_caravane", 20);
  const I7 = isCC ? f(forfaits, "atelier_cc", 200) : f(forfaits, "atelier_caravane", 150);
  const carteGrise = isCC ? f(forfaits, "carte_grise_cc", 790) : f(forfaits, "carte_grise_caravane", 380);

  const I27 = optionsChoisies.reduce((s, o) => s + Number(o.achat_ht || 0), 0);
  const J27 = optionsChoisies.reduce((s, o) => s + Number(o.cession_pose || 0), 0);
  const K27 = optionsChoisies.reduce((s, o) => s + Number(o.prix_ttc || 0), 0);

  const E19 = Number(modele.prix_usine_ht);
  const E20 = 0, E21 = 0, E22 = 0, E23 = 0; // frais annexes, à saisir au cas par cas dans le dossier
  const I45 = 0, J45 = 0; // prépa / provision SAV / expo — à brancher sur le dossier

  const sommeCouts = E19 + E20 + E21 + E22 + E23 + I4 + I7 + I27 + J27 + I45 + J45;

  const E24 = Number(modele.prix_public_ttc);
  const E25 = E24 + K27 + carteGrise;
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
    I4, I7, carteGrise, I27, J27, K27, sommeCouts,
    E24, E25, E27, D27, D28, destockage, E28, E29, E30, E31,
    E33, E34, E35, D34, commission,
  };
}
