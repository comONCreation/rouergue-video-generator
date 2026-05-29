import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { colors, mapCamera, stageRecap } from "../theme";
import { resolveMapboxStyle } from "../rally.config";
import type { StagedRoute } from "../route/stagedRoute";
import { MapFallback } from "./MapFallback";
import { MapEdgeScrim } from "./MapEdgeScrim";
import { loadAllPinImages } from "../map/mapLayers";
import {
  addStageRecapLayers,
  buildStageRecapBounds,
} from "../map/stageRecapLayers";
import {
  STATIC_RENDER_MAP_OPTIONS,
  completeWhenMapSettled,
} from "../map/mapboxSetup";

type StageRecapMapProps = {
  route: StagedRoute;
};

// Carte figée de toute l'étape (vue de dessus) pour le récap de fin d'étape.
// Contrairement à ContinuousStageMap, aucune mise à jour caméra par frame :
// on cadre l'étape entière une fois au chargement, puis l'image reste fixe.
export const StageRecapMap: React.FC<StageRecapMapProps> = ({ route }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.REMOTION_MAPBOX_TOKEN;
    const style = resolveMapboxStyle();

    if (!token) {
      setError("Token Mapbox manquant : renseigne REMOTION_MAPBOX_TOKEN.");
      return;
    }

    if (!containerRef.current) return;

    let cancelled = false;
    let completed = false;
    const handle = delayRender(`Chargement récap étape`, {
      timeoutInMilliseconds: mapCamera.renderTimeouts.loadMapMs,
    });

    const complete = () => {
      if (completed) return;
      completed = true;
      continueRender(handle);
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      complete();
    };

    const setup = () => {
      try {
        mapboxgl.accessToken = token;
        const bounds = buildStageRecapBounds(route);
        const map = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style,
          bounds,
          fitBoundsOptions: {
            padding: stageRecap.map.padding,
            bearing: stageRecap.map.bearing,
            pitch: stageRecap.map.pitch,
            maxZoom: stageRecap.map.maxZoom,
          },
          ...STATIC_RENDER_MAP_OPTIONS,
        });

        mapRef.current = map;

        map.once("load", async () => {
          try {
            if (cancelled) return;
            await loadAllPinImages(map);
            if (cancelled) return;
            addStageRecapLayers(map, route);

            completeWhenMapSettled(map, {
              isCancelled: () => cancelled,
              onSettled: complete,
            });
          } catch (err) {
            fail(err instanceof Error ? err.message : String(err));
          }
        });

        map.on("error", (event) => {
          console.warn("Mapbox récap error", event.error);
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    };

    setup();

    return () => {
      cancelled = true;
      complete();
      // Pas de map.remove() : comme ContinuousStageMap, on laisse Remotion
      // gérer le cycle de vie du rendu (un remove() peut le perturber).
      mapRef.current = null;
    };
  }, [route]);

  if (error) {
    return <MapFallback>{error}</MapFallback>;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <MapEdgeScrim />
    </AbsoluteFill>
  );
};
