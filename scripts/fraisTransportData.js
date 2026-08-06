// Frais de sortie usine et transport usine par défaut, par marque.
// Source : FRAIS_DE_TRANSPORTS_configurateur.xlsx
// Ces valeurs pré-remplissent les champs correspondants dans le Calculateur quand une marque
// est sélectionnée ; l'utilisateur peut toujours les modifier manuellement ensuite.
const FRAIS_TRANSPORT_PAR_MARQUE = {
  "Adria": { fraisSortieUsine: 0, transportUsine: 1800 },
  "Benimar": { fraisSortieUsine: 0, transportUsine: 0 },
  "Campereve": { fraisSortieUsine: 280, transportUsine: 0 },
  "Chausson": { fraisSortieUsine: 115, transportUsine: 0 },
  "Dreamer": { fraisSortieUsine: 280, transportUsine: 0 },
  "Elios": { fraisSortieUsine: 0, transportUsine: 1800 },
  "Fleurette": { fraisSortieUsine: 330, transportUsine: 0 },
  "Hymer": { fraisSortieUsine: 77, transportUsine: 1300 },
  "Hymer Camper Vans": { fraisSortieUsine: 77, transportUsine: 1150 },
  "Randger": { fraisSortieUsine: 100, transportUsine: 0 },
  "Rapido": { fraisSortieUsine: 280, transportUsine: 0 },
  "Stylevan": { fraisSortieUsine: 330, transportUsine: 0 },
};

module.exports = { FRAIS_TRANSPORT_PAR_MARQUE };
