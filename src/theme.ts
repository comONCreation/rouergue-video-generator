// Charte graphique Rallye Aveyron Rouergue Occitanie
export const colors = {
  blue: "#0F5699",
  blueDark: "#0A3C70",
  orange: "#F59E20",
  orangeDark: "#D8861A",
  white: "#FFFFFF",
  whiteSubtle: "rgba(255, 255, 255, 0.72)",
  whiteFaint: "rgba(255, 255, 255, 0.42)",
  panelBgTop: "rgba(10, 50, 95, 0.96)",
  panelBgBottom: "rgba(15, 86, 153, 0.92)",
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
  // Compact mode (après minimisation)
  compactWidth: 700,
  compactPadding: 20,
  compactMargin: 32,
  // Timing (secondes)
  minimizeAtSeconds: 6,
  minimizeDurationSeconds: 0.6,
};

export const mapCamera = {
  defaultStyle: "mapbox://styles/comoncreation/cmoyoojin000r01sfep4hdvb9",
  zoom: 14,
  pitch: {
    es: 50,
    liaison: 50,
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
  },
  progress: {
    holdSeconds: 3,
  },
  cameraSpeed: {
    es: 2500,
    liaison: 4500,
  },
  renderTimeouts: {
    loadMapMs: 90000,
    frameMs: 5000,
    frameFallbackMs: 900,
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
    publicZone: 0.15,
  },
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
