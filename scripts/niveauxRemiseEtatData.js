// Paliers de remise en état pour les véhicules d'occasion repris (module Reprise · Soulte).
// Un seul palier pour l'instant ("De base") — à compléter avec les autres paliers et leurs coûts
// une fois les forfaits définis. Ajouter simplement une entrée ici suffit, le menu déroulant du
// Calculateur et de l'édition de dossier se met à jour automatiquement.
const NIVEAUX_REMISE_ETAT = {
  de_base: { label: "De base", cout: 100 },
};

module.exports = { NIVEAUX_REMISE_ETAT };
