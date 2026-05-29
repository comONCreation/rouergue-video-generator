import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, mapPins, stageIntro } from "../theme";
import {
  SEGMENTS,
  getStageEsKm,
  getStageLiaisonKm,
  getStageTotalKm,
} from "../data/segments";
import { formatStageTitle } from "../rally.config";
import { formatKm } from "../theme/format";
import {
  bodyStyle,
  labelMicroStyle,
  labelStyle,
  unitStyle,
  valueStyle,
} from "../theme/typography";
import { AnimatedBlock } from "./AnimatedBlock";
import { Logo } from "./Logo";

type Props = {
  stage: number;
};

const Divider: React.FC = () => (
  <div
    style={{
      height: 1,
      background:
        "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.28), rgba(255,255,255,0.05))",
    }}
  />
);

const KmStat: React.FC<{
  label: string;
  km: number;
  accentColor: string;
  emphasis?: boolean;
}> = ({ label, km, accentColor, emphasis = false }) => (
  <div
    style={{
      background: "rgba(0, 0, 0, 0.32)",
      borderLeft: `4px solid ${accentColor}`,
      padding: "20px 22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}
  >
    <span style={labelMicroStyle}>{label}</span>
    <span
      style={{
        ...valueStyle,
        fontSize: emphasis ? 40 : 32,
        whiteSpace: "nowrap",
      }}
    >
      {formatKm(km)}
      <span style={unitStyle}>km</span>
    </span>
  </div>
);

const LegendItem: React.FC<{
  swatch: React.ReactNode;
  label: string;
}> = ({ swatch, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    {swatch}
    <span style={{ ...labelMicroStyle, color: colors.whiteSubtle }}>
      {label}
    </span>
  </div>
);

const LineSwatch: React.FC<{ color: string }> = ({ color }) => (
  <span
    style={{
      width: 26,
      height: 6,
      borderRadius: 3,
      backgroundColor: color,
      boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
    }}
  />
);

export const StageRecapOverlay: React.FC<Props> = ({ stage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelIn = spring({
    frame,
    fps,
    config: { damping: 220, stiffness: 110, mass: 0.7 },
  });
  const translateX = (1 - panelIn) * -layout.panelWidth;

  const stageSegments = SEGMENTS.filter((segment) => segment.stage === stage);
  const esCount = stageSegments.filter(
    (segment) => segment.type === "ES"
  ).length;
  const date = stageSegments[0]?.date;

  const esKm = getStageEsKm(stage);
  const liaisonKm = getStageLiaisonKm(stage);
  const totalKm = getStageTotalKm(stage);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: layout.panelWidth,
        height: layout.height,
        transform: `translateX(${translateX}px)`,
        opacity: panelIn,
        background: `linear-gradient(180deg, ${colors.panelBgTop}, ${colors.panelBgBottom})`,
        backdropFilter: `blur(${layout.panelBlurPx}px)`,
        boxShadow: `4px 0 24px ${colors.shadow}`,
        padding: layout.panelPadding,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        boxSizing: "border-box",
        borderRight: `4px solid ${colors.orange}`,
        fontFamily: fonts.display,
      }}
    >
      <AnimatedBlock delay={6}>
        <Logo width={320} style={{ margin: "0 auto" }} />
      </AnimatedBlock>

      <Divider />

      <AnimatedBlock delay={12}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 30 }}>
          <span style={{ ...labelStyle }}>Récapitulatif</span>
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 64,
              lineHeight: 0.98,
              color: colors.white,
            }}
          >
            {formatStageTitle(stage)}
          </span>
          {date && (
            <span style={{ ...bodyStyle, color: colors.whiteSubtle }}>
              {date}
            </span>
          )}
        </div>
      </AnimatedBlock>

      <div style={{ flex: 1 }} />

      <AnimatedBlock delay={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={labelStyle}>Distances parcourues</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <KmStat
              label={`${esCount} Spéciales`}
              km={esKm}
              accentColor={colors.orange}
            />
            <KmStat label="Liaisons" km={liaisonKm} accentColor={colors.blue} />
            <KmStat
              label="Total parcouru"
              km={totalKm}
              accentColor={colors.white}
              emphasis
            />
          </div>
        </div>
      </AnimatedBlock>

      <Divider />

      <AnimatedBlock delay={30}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px 24px",
          }}
        >
          <LegendItem
            swatch={<LineSwatch color={colors.orange} />}
            label="Spéciales"
          />
          <LegendItem
            swatch={<LineSwatch color={colors.blue} />}
            label="Liaisons"
          />
          <LegendItem
            swatch={
              <Img
                src={staticFile(mapPins.publicZonePath)}
                style={{ width: 22, height: "auto", display: "block" }}
              />
            }
            label="Zones publiques"
          />
        </div>
      </AnimatedBlock>
    </div>
  );
};
