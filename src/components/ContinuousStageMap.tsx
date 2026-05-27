import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { pointAtDistance } from "../route/gpx";
import { colors, mapCamera, withAlpha } from "../theme";
import type { SmoothedCameraTerrainAltitudeState } from "../map/mapboxRenderConfig";
import { resolveMapboxStyle } from "../rally.config";
import type { StagedRoute } from "../route/stagedRoute";
import {
  getActiveContext,
  type StageTimeline,
} from "../route/stageTimeline";
import { buildFirstWaypointMediaEntries } from "../data/waypointMedia";
import { MapFallback } from "./MapFallback";
import { WaypointMediaCallout } from "./WaypointMediaCallout";
import { loadAllPinImages } from "../map/mapLayers";
import {
  asParsedRoute,
  buildContinuousCameraPath,
  type CameraState,
} from "../map/continuousCameraPath";
import {
  buildWaypointClusters,
} from "../map/continuousWaypoints";
import {
  addRouteLayers,
  updateMapFrame,
} from "../map/continuousMapFrame";

type ContinuousStageMapProps = {
  route: StagedRoute;
  timeline: StageTimeline;
  renderDurationInFrames?: number;
  startDelayFrames?: number;
};

export const ContinuousStageMap: React.FC<ContinuousStageMapProps> = ({
  route,
  timeline,
  renderDurationInFrames,
  startDelayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const cameraDurationInFrames = renderDurationInFrames ?? durationInFrames;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const cameraPathRef = useRef<CameraState[]>([]);
  const lastActiveSegmentIndexRef = useRef<number>(-1);
  const markerDistancesRef = useRef<number[]>([]);
  const terrainAltitudeStateRef = useRef<SmoothedCameraTerrainAltitudeState>({
    frame: null,
    altitudeMeters: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waypointClusters = useMemo(() => buildWaypointClusters(route), [route]);
  const mediaCueByKeyPointIndex = useMemo(
    () =>
      new Map(
        buildFirstWaypointMediaEntries(timeline.keyPoints).map((entry) => [
          entry.index,
          entry.cue,
        ])
      ),
    [timeline]
  );

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
    const handle = delayRender(`Chargement carte étape`, {
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

    const setup = async () => {
      try {
        const cameraPath = buildContinuousCameraPath(
          route,
          timeline,
          cameraDurationInFrames,
          fps
        );
        cameraPathRef.current = cameraPath;
        mapboxgl.accessToken = token;

        const start = cameraPath[0];
        const map = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style,
          center: start.center,
          zoom: start.zoom,
          bearing: start.bearing,
          pitch: start.pitch,
          interactive: false,
          preserveDrawingBuffer: true,
          fadeDuration: mapCamera.fadeDurationMs,
          refreshExpiredTiles: true,
          logoPosition: "bottom-right",
          attributionControl: false,
          collectResourceTiming: false,
          performanceMetricsCollection: false,
        });

        mapRef.current = map;

        map.once("load", async () => {
          try {
            if (cancelled) return;

            await loadAllPinImages(map);

            lastActiveSegmentIndexRef.current = -1;
            markerDistancesRef.current = [];
            addRouteLayers(map, route, waypointClusters);
            updateMapFrame(
              map,
              route,
              start,
              waypointClusters,
              lastActiveSegmentIndexRef,
              markerDistancesRef,
              0,
              fps,
              terrainAltitudeStateRef.current
            );

            let removeInitialSettledListeners = () => {};
            const completeInitialWhenSettled = () => {
              if (cancelled) {
                removeInitialSettledListeners();
                return;
              }
              if (!map.loaded() || !map.areTilesLoaded()) return;
              removeInitialSettledListeners();
              setIsReady(true);
              complete();
            };
            removeInitialSettledListeners = () => {
              map.off("idle", completeInitialWhenSettled);
              map.off("render", completeInitialWhenSettled);
            };
            map.on("idle", completeInitialWhenSettled);
            map.on("render", completeInitialWhenSettled);
            map.triggerRepaint();
            completeInitialWhenSettled();
          } catch (err) {
            fail(err instanceof Error ? err.message : String(err));
          }
        });

        map.on("error", (event) => {
          console.warn("Mapbox error", event.error);
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    };

    setup();

    return () => {
      cancelled = true;
      complete();
      mapRef.current = null;
      cameraPathRef.current = [];
      terrainAltitudeStateRef.current = { frame: null, altitudeMeters: null };
    };
  }, [
    cameraDurationInFrames,
    fps,
    route,
    timeline,
    waypointClusters,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map) return;
    const cameraPath = cameraPathRef.current;
    const cameraFrame = Math.max(0, frame - startDelayFrames);
    const cameraState =
      cameraPath[Math.min(cameraFrame, cameraPath.length - 1)] ??
      cameraPath[0];
    if (!cameraState) return;

    let done = false;
    const handle = delayRender(`Frame étape:${frame}`, {
      timeoutInMilliseconds: mapCamera.renderTimeouts.frameMs,
    });
    const complete = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    const completeWhenSettled = () => {
      if (!map.loaded() || !map.areTilesLoaded()) return;
      complete();
    };

    map.on("idle", completeWhenSettled);
    map.on("render", completeWhenSettled);
    updateMapFrame(
      map,
      route,
      cameraState,
      waypointClusters,
      lastActiveSegmentIndexRef,
      markerDistancesRef,
      cameraFrame,
      fps,
      terrainAltitudeStateRef.current
    );
    map.triggerRepaint();
    completeWhenSettled();

    const timeout = window.setTimeout(
      complete,
      mapCamera.renderTimeouts.frameFallbackMs
    );

    return () => {
      window.clearTimeout(timeout);
      map.off("idle", completeWhenSettled);
      map.off("render", completeWhenSettled);
      complete();
    };
  }, [
    frame,
    fps,
    isReady,
    route,
    startDelayFrames,
    waypointClusters,
  ]);

  if (error) {
    return <MapFallback>{error}</MapFallback>;
  }

  const cameraFrame = Math.max(0, frame - startDelayFrames);
  const activeContext = getActiveContext(timeline, cameraFrame / fps);
  const activeMediaCue =
    activeContext?.phase.kind === "hold"
      ? mediaCueByKeyPointIndex.get(activeContext.phase.keyPointIndex) ?? null
      : null;
  const mediaDelaySeconds =
    activeContext?.phase.kind === "hold" &&
    activeContext.currentKeyPoint?.type === "stage-start" &&
    activeMediaCue
      ? Math.max(
          0,
          activeContext.phase.endTime -
            activeContext.phase.startTime -
            activeMediaCue.holdSeconds
        )
      : 0;
  const mediaStartSeconds =
    activeContext?.phase.kind === "hold"
      ? activeContext.phase.startTime + mediaDelaySeconds
      : 0;
  const mediaEndSeconds =
    activeContext?.phase.kind === "hold" ? activeContext.phase.endTime : 0;
  const mediaProgress =
    activeContext?.phase.kind === "hold" && activeMediaCue
      ? Math.max(
          0,
          Math.min(
            1,
            (cameraFrame / fps - mediaStartSeconds) /
              Math.max(1e-6, mediaEndSeconds - mediaStartSeconds)
          )
        )
      : 0;
  const activeMediaPoint =
    activeMediaCue &&
    mediaProgress > 0 &&
    activeContext?.currentKeyPoint &&
    mapRef.current
      ? mapRef.current.project(
          activeContext.currentKeyPoint.rawWaypoint?.coordinates ??
            pointAtDistance(
              asParsedRoute(route),
              activeContext.currentKeyPoint.distance
            ).point
        )
      : null;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(5, 14, 28, 0.44) 0%, rgba(5, 14, 28, 0.22) 27%, rgba(5, 14, 28, 0) 62%)",
        }}
      />
      {activeMediaCue && activeMediaPoint && activeContext && (
        <WaypointMediaCallout
          cue={activeMediaCue}
          point={{ x: activeMediaPoint.x, y: activeMediaPoint.y }}
          progress={mediaProgress}
          mediaStartFrame={
            startDelayFrames + Math.round(mediaStartSeconds * fps)
          }
        />
      )}
    </AbsoluteFill>
  );
};
