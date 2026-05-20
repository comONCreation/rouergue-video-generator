// Charte graphique et constantes de rendu.
// Identité du rallye en cours : voir src/rally.config.ts.
export const colors = {
  blue: "#0F5699",
  blueDark: "#0A3C70",
  orange: "#F59E20",
  orangeDark: "#D8861A",
  white: "#FFFFFF",
  whiteSubtle: "rgba(255, 255, 255, 0.72)",
  whiteFaint: "rgba(255, 255, 255, 0.42)",
  panelBgTop: "rgba(10, 50, 95, 0.86)",
  panelBgBottom: "rgba(15, 86, 153, 0.82)",
  shadow: "rgba(0, 0, 0, 0.45)",
};

export const fonts = {
  display: "Montserrat",
};

export const layout = {
  width: 1920,
  height: 1080,
  fps: 60,
  panelWidth: 620,
  panelPadding: 36,
  panelBlurPx: 14,
  // Compact mode (après minimisation)
  compactWidth: 700,
  compactPadding: 20,
  compactMargin: 32,
  // Timing (secondes)
  minimizeAtSeconds: 6,
  minimizeDurationSeconds: 0.6,
};

export const stageIntro = {
  // Le début d'étape dure: card.durationSeconds + flyInSeconds.
  // La card reste fixe, puis la caméra fait son fly-in vers le tracé.
  flyInSeconds: 3,
  plaque: {
    durationSeconds: 6,
    enterSeconds: 0.45,
    exitSeconds: 0.55,
    startScale: 0.9,
    endScale: 1.015,
    introWidth: 960,
    introShadow: "0 34px 72px",
    bugTop: 34,
    bugRight: 42,
    bugWidth: 280,
    bugShadow: "0 10px 24px rgba(0, 0, 0, 0.34)",
  },
  card: {
    durationSeconds: 6,
    enterSeconds: 0.5,
    exitSeconds: 0.55,
    startScale: 0.965,
    endScale: 1,
    width: 820,
    padding: 96,
    borderWidth: 6,
    shadow: "0 32px 90px",
    contentPadding: "52px 58px 42px",
    contentGap: 18,
    titleFontSize: 112,
    dateFontSize: 26,
    statPadding: "22px 26px",
    statGap: 8,
    statValueFontSize: 34,
    gridGap: 1,
    accentBarHeight: 5,
    animationOffsetY: 18,
    delays: {
      label: 10,
      title: 18,
      date: 30,
      stats: 42,
    },
  },
  backdrop: {
    exitSeconds: 0.55,
    blurPx: 10,
    background:
      "radial-gradient(circle at 50% 46%, rgba(7, 17, 31, 0.30) 0%, rgba(7, 17, 31, 0.56) 56%, rgba(7, 17, 31, 0.74) 100%)",
  },
};

export const mapCamera = {
  zoom: {
    es: 14.5,
    liaison: 14,
  },
  pitch: {
    es: 50,
    liaison: 55,
  },
  padding: {
    top: 96,
    bottom: 96,
    leftPanelGap: 80,
    right: 140,
  },
  cinematic: {
    centerLead: {
      minMeters: 80,
      maxMeters: 420,
      routeDistanceRatio: 0.014,
    },
    centerHalfLifeSeconds: 0.9,
    bearingLead: {
      minMeters: 480,
      maxMeters: 1800,
      routeDistanceRatio: 0.045,
    },
    bearingWindow: {
      minMeters: 900,
      maxMeters: 3600,
      routeDistanceRatio: 0.12,
      sampleCount: 17,
    },
    bearingHalfLifeSeconds: 2.2,
    // Lissage du pitch et du zoom lors d'un changement de type de segment
    // (ES ↔ liaison). Évite la cassure visuelle d'un saut instantané.
    pitchHalfLifeSeconds: 2,
    zoomHalfLifeSeconds: 2,
    // Lissage vertical de la caméra : amortit les variations d'altitude du
    // terrain sans modifier l'exagération du relief dans le style Mapbox.
    terrainAltitudeHalfLifeSeconds: 2,
  },
  // Vidéos par segment unitaire (S1-ES1, S1-L02, …).
  segmentVideo: {
    // Caméra immobile pendant cette durée au tout début (intro) ET à la fin
    // (outro) de chaque vidéo de segment, pour laisser l'overlay s'animer.
    introOutroHoldSeconds: 3,
  },
  cameraSpeed: {
    es: 2000,
    liaison: 5000,
  },
  // Durée fixe de l'accélération et de la décélération caméra. Le reste du
  // transit se fait à vitesse constante, pour éviter qu'un long tracé garde
  // une accélération étirée sur toute sa durée.
  travelEaseSeconds: 2,
  // Vidéo continue d'étape complète (FULL-S1, FULL-S2).
  stageVideo: {
    // Durée des pauses caméra à chaque key point. Les points avec média
    // gardent la caméra plus longtemps pour laisser le callout respirer.
    keyPointHoldSeconds: {
      default: 4,
      media: 6,
    },
    // Pose caméra au début du fly-in (juste avant que la carte s'aligne sur la
    // trajectoire). Décalée du bearing/pitch/zoom cibles ; les minima évitent
    // une pose finale trop plongeante ou trop large sur les courtes étapes.
    introCamera: {
      bearingOffsetDegrees: -20,
      pitchDelta: -18,
      zoomDelta: -2.6,
      minPitch: 28,
      minZoom: 10.8,
    },
  },
  fadeDurationMs: 1000,
  renderTimeouts: {
    loadMapMs: 90000,
    frameMs: 5000,
    frameFallbackMs: 2500,
  },
};

export const mapRoute = {
  outlineColor: "#111111",
  fullRouteOpacity: 0.2,
  fullOutlineOpacity: 0,
  progressOutlineOpacity: 0.2,
  fullOutlineExtraWidth: 0,
  progressOutlineExtraWidth: 4,
  lineWidthStops: {
    lowZoom: 10, lowWidth: 4,
    midZoom: 13, midWidth: 7,
    highZoom: 16, highWidth: 12,
  },
  // Seuils utilisés par la route fusionnée (étape complète).
  // - dedupeMeters : tolérance pour confondre deux trkpt consécutifs lors
  //   du merge des GPX.
  // - clusterRadiusMeters : rayon dans lequel deux waypoints sont
  //   considérés comme le même lieu (1 seul pin affiché).
  // - coincidentKeyPointsMeters : deux key points plus proches que ça sont
  //   fusionnés en un seul hold caméra.
  // - visiblePastSegments : nombre de segments précédents qui restent
  //   visibles sur la carte ; au-delà, le tracé passé disparaît pour
  //   éviter la superposition sur les boucles.
  thresholds: {
    dedupeMeters: 0.5,
    clusterRadiusMeters: 150,
    coincidentKeyPointsMeters: 150,
    visiblePastSegments: 2,
  },
  tracker: {
    haloColor: "rgba(255, 255, 255, 0.88)",
    haloStrokeColor: "rgba(7, 17, 31, 0.8)",
    haloStrokeWidth: 3,
    coreStrokeColor: "#ffffff",
    coreStrokeWidth: 2,
    radiusStops: {
      lowZoom: 10,
      highZoom: 16,
      haloLowRadius: 7,
      haloHighRadius: 14,
      coreLowRadius: 4,
      coreHighRadius: 8,
    },
  },
};

export const mapPins = {
  startPath: "markers/start.png",
  finishPath: "markers/finish.png",
  standardPath: "markers/standard.png",
  publicZonePath: "markers/zp.png",
  iconSize: {
    startFinish: 0.65,
    standard: 0.65,
    publicZone: 1,
  },
  publicZoneRevealFadeMeters: 140,
  label: {
    font: ["Montserrat Bold", "Arial Unicode MS Bold"],
    textOffset: {
      x: 0,
      y: -10,
    },
    letterSpacing: 0.04,
    maxWidth: 24,
    lowZoom: 10,
    lowSize: 14,
    highZoom: 15,
    highSize: 22,
    color: "#FFFFFF",
    haloColor: "rgba(20, 20, 20, 0.4)",
    haloWidth: 1,
    haloBlur: 10,
  },
};
