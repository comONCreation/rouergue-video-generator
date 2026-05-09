import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, layout } from "../theme";
import {
  RALLY_TOTAL_KM,
  SECTIONS,
  type Segment,
  getCumulativeKm,
  getStageTotalKm,
} from "../data/segments";
import { Logo } from "./Logo";
import { StageIndicator } from "./StageIndicator";
import { SegmentBlock } from "./SegmentBlock";
import { StageProgress } from "./StageProgress";
import { formatKm } from "../format";
import { labelStyle, valueMediumStyle } from "../typography";

const Divider: React.FC = () => (
  <div
    style={{
      height: 1,
      background:
        "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.28), rgba(255,255,255,0.05))",
    }}
  />
);

// Anime un bloc avec un slide-up + fade-in décalé
const AnimatedBlock: React.FC<{
  delay: number;
  children: React.ReactNode;
}> = ({ delay, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.6 },
  });
  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 14}px)`,
      }}
    >
      {children}
    </div>
  );
};

type Props = {
  segment: Segment;
  /** 0 = entièrement visible, 1 = caché (minimisé) */
  hide: number;
};

export const LeftPanel: React.FC<Props> = ({ segment, hide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide-in du panneau entier depuis la gauche au démarrage
  const panelIn = spring({
    frame,
    fps,
    config: { damping: 220, stiffness: 110, mass: 0.7 },
  });

  // Combine slide-in initial + sortie vers la gauche lors de la minimisation
  const inProgress = panelIn; // 0 → 1 à l'entrée
  const outOffset = hide * -layout.panelWidth * 1.1;
  const translateX = (1 - inProgress) * -layout.panelWidth + outOffset;
  const opacity = (1 - hide) * inProgress;

  const cumulativeKm = getCumulativeKm(segment.id);
  const stageTotal = getStageTotalKm(segment.stage);
  const sectionMeta = SECTIONS.find((s) => s.number === segment.section);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: layout.panelWidth,
        height: layout.height,
        transform: `translateX(${translateX}px)`,
        opacity,
        background: `linear-gradient(180deg, ${colors.panelBgTop}, ${colors.panelBgBottom})`,
        boxShadow: `4px 0 24px ${colors.shadow}`,
        padding: layout.panelPadding,
        display: "flex",
        flexDirection: "column",
        gap: 26,
        boxSizing: "border-box",
        borderRight: `4px solid ${colors.orange}`,
      }}
    >
      <AnimatedBlock delay={6}>
        <Logo width={340} style={{ margin: "0 auto" }} />
      </AnimatedBlock>

      <Divider />

      <AnimatedBlock delay={14}>
        <StageIndicator
          stage={segment.stage}
          date={segment.date}
          section={segment.section}
          sectionName={sectionMeta?.name ?? ""}
        />
      </AnimatedBlock>

      <AnimatedBlock delay={22}>
        <SegmentBlock segment={segment} />
      </AnimatedBlock>

      <div style={{ flex: 1 }} />

      <AnimatedBlock delay={32}>
        <StageProgress
          cumulativeKm={cumulativeKm}
          totalKm={stageTotal}
          label={`Progression étape ${segment.stage}`}
        />
      </AnimatedBlock>

      <Divider />

      <AnimatedBlock delay={38}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={labelStyle}>Total rallye</span>
          <span style={valueMediumStyle}>
            {formatKm(RALLY_TOTAL_KM)} km
          </span>
        </div>
      </AnimatedBlock>
    </div>
  );
};

// Helper exposé : calcule la valeur de "hide" (0..1) selon le frame courant
// et le moment de minimisation configuré.
export const useHideProgress = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startFrame = layout.minimizeAtSeconds * fps;
  const endFrame = startFrame + layout.minimizeDurationSeconds * fps;
  return interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};
