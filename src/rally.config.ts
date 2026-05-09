// Métadonnées de l'édition courante.
//
// Pour basculer sur la prochaine édition :
// 1. Modifier les valeurs ci-dessous (édition, année, dates).
// 2. Remplacer les fichiers GPX dans public/GPX/Étape 1/ et Étape 2/.
// 3. Mettre à jour la liste des segments dans src/data/segments.ts.
// Tout le reste du code consomme ces valeurs.

export const RALLY = {
  edition: 52,
  year: 2026,
  shortName: "Rallye Aveyron Rouergue Occitanie",
  fullName: "52e Rallye Aveyron Rouergue Occitanie",
  stageDates: [
    "Vendredi 10 juillet 2026",
    "Samedi 11 juillet 2026",
  ],
  // Style Mapbox par défaut. Surchargeable via REMOTION_MAPBOX_STYLE
  // dans le fichier .env.
  mapboxStyleFallback:
    "mapbox://styles/comoncreation/cmoyoojin000r01sfep4hdvb9",
} as const;

export const STAGE_COUNT = RALLY.stageDates.length;

export const resolveMapboxStyle = () =>
  process.env.REMOTION_MAPBOX_STYLE ?? RALLY.mapboxStyleFallback;
