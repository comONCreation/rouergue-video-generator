import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Sequence,
  useVideoConfig,
} from "remotion";
import { ContinuousStageMap } from "./components/ContinuousStageMap";
import { SegmentOverlay } from "./SegmentOverlay";
import { StageIntroOverlay } from "./components/StageIntroOverlay";
import { SEGMENTS } from "./data/segments";
import {
  findActiveSegmentSpan,
  loadStagedRoute,
  type StagedRoute,
} from "./stagedRoute";
import {
  buildStageTimeline,
  getDistanceAtTime,
  getStageIntroCardSeconds,
  getStageIntroHoldSeconds,
  type StageTimeline,
} from "./stageTimeline";
import { colors, fonts, mapCamera } from "./theme";

type Props = { stage: 1 | 2 };

const StageStatus: React.FC<{ message: string }> = ({ message }) => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(135deg, #07111f 0%, #0f335a 56%, #2e4660 100%)",
      color: colors.white,
      fontFamily: fonts.display,
      fontSize: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: 80,
    }}
  >
    {message}
  </AbsoluteFill>
);

type SegmentDisplayEntry = {
  segmentId: string;
  fromFrame: number;
  durationFrames: number;
};

// Une entrée par occurrence de segment : couvre toute la traversée du
// segment (hold d'entrée + transit + hold de sortie). Cela laisse à
// l'overlay le temps complet de jouer son animation, et ré-affiche
// l'overlay à chaque nouvelle visite quand le tracé reboucle.
const buildSegmentDisplayEntries = (
  route: StagedRoute,
  timeline: StageTimeline,
  fps: number,
  durationInFrames: number,
  hiddenUntilFrame: number
): SegmentDisplayEntry[] => {
  const entries: SegmentDisplayEntry[] = [];
  let currentSegmentId: string | null = null;
  let currentStart = 0;

  const addEntry = (segmentId: string, fromFrame: number, toFrame: number) => {
    const clippedFrom = Math.max(fromFrame, hiddenUntilFrame);
    const clippedTo = Math.max(clippedFrom, toFrame);
    if (clippedTo <= clippedFrom) return;
    entries.push({
      segmentId,
      fromFrame: clippedFrom,
      durationFrames: Math.max(1, clippedTo - clippedFrom),
    });
  };

  for (let frame = 0; frame < durationInFrames; frame++) {
    const time = frame / fps;
    const distance = getDistanceAtTime(timeline, time);
    const span = findActiveSegmentSpan(route, distance);
    const segmentId = span.segment.id;
    if (segmentId !== currentSegmentId) {
      if (currentSegmentId !== null) {
        addEntry(currentSegmentId, currentStart, frame);
      }
      currentSegmentId = segmentId;
      currentStart = frame;
    }
  }
  if (currentSegmentId !== null) {
    addEntry(currentSegmentId, currentStart, durationInFrames);
  }
  return entries;
};

export const FullStageVideo: React.FC<Props> = ({ stage }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const [route, setRoute] = useState<StagedRoute | null>(null);
  const [timeline, setTimeline] = useState<StageTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = delayRender(`Chargement étape ${stage}`, {
      timeoutInMilliseconds: mapCamera.renderTimeouts.loadMapMs,
    });
    let cancelled = false;

    const load = async () => {
      try {
        const segments = SEGMENTS.filter((s) => s.stage === stage);
        const loadedRoute = await loadStagedRoute(segments);
        if (cancelled) return;
        const builtTimeline = buildStageTimeline(loadedRoute);
        if (cancelled) return;
        setRoute(loadedRoute);
        setTimeline(builtTimeline);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) continueRender(handle);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [stage]);

  const introDurationFrames = useMemo(
    () =>
      timeline ? Math.round(getStageIntroHoldSeconds(timeline) * fps) : 0,
    [timeline, fps]
  );

  const introCardFrames = useMemo(
    () =>
      timeline
        ? Math.max(1, Math.round(getStageIntroCardSeconds(timeline) * fps))
        : 0,
    [timeline, fps]
  );

  const segmentEntries = useMemo(
    () =>
      route && timeline
        ? buildSegmentDisplayEntries(
            route,
            timeline,
            fps,
            durationInFrames,
            introDurationFrames
          )
        : [],
    [route, timeline, fps, durationInFrames, introDurationFrames]
  );

  if (error) {
    return <StageStatus message={`Erreur : ${error}`} />;
  }

  if (!route || !timeline) {
    return <StageStatus message="Chargement de l'étape…" />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#07111f" }}>
      <ContinuousStageMap route={route} timeline={timeline} />
      {introDurationFrames > 0 && (
        <Sequence durationInFrames={introCardFrames} layout="none">
          <StageIntroOverlay
            stage={stage}
            durationFrames={introCardFrames}
          />
        </Sequence>
      )}
      {segmentEntries.map((entry, index) => (
        <Sequence
          key={`segment-${index}-${entry.segmentId}`}
          from={entry.fromFrame}
          durationInFrames={entry.durationFrames}
          layout="none"
        >
          <SegmentOverlay segmentId={entry.segmentId} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
