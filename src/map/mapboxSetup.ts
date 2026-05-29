import mapboxgl from "mapbox-gl";
import { mapCamera } from "../theme";

// Bootstrap Mapbox partagé par les cartes de rendu Remotion (carte d'étape
// continue + récap figé). Centralise ce qui est strictement identique entre
// elles ; le centre/zoom (ou bounds) et le style restent propres à chaque vue.

// Options communes à toutes les cartes : non interactives, buffer préservé pour
// la capture frame par frame, aucune collecte de métriques ni UI superflue.
export const STATIC_RENDER_MAP_OPTIONS = {
  interactive: false,
  preserveDrawingBuffer: true,
  fadeDuration: mapCamera.fadeDurationMs,
  refreshExpiredTiles: true,
  logoPosition: "bottom-right",
  attributionControl: false,
  collectResourceTiming: false,
  performanceMetricsCollection: false,
} as const satisfies Partial<mapboxgl.MapOptions>;

// Attend que la carte soit chargée ET ses tuiles prêtes, puis exécute
// `onSettled` exactement une fois. Indispensable côté Remotion : on ne relâche
// le delayRender qu'une fois la frame réellement stable. Les listeners se
// désinscrivent tout seuls, y compris si `isCancelled()` passe à true entre-temps.
export const completeWhenMapSettled = (
  map: mapboxgl.Map,
  {
    isCancelled,
    onSettled,
  }: { isCancelled: () => boolean; onSettled: () => void }
): void => {
  let removeListeners = () => {};
  const check = () => {
    if (isCancelled()) {
      removeListeners();
      return;
    }
    if (!map.loaded() || !map.areTilesLoaded()) return;
    removeListeners();
    onSettled();
  };
  removeListeners = () => {
    map.off("idle", check);
    map.off("render", check);
  };
  map.on("idle", check);
  map.on("render", check);
  map.triggerRepaint();
  check();
};
