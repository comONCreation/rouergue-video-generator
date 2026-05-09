// Helpers de formatage partagés entre composants.

/** Distance en km arrondie à 1 décimale, format fr-FR ("20,0", "8,5"). */
export const formatKm = (km: number) =>
  km.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
