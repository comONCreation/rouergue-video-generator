import React from "react";
import { colors, gradients, layout } from "../theme";
import type { Segment } from "../data/segments";
import {
  RALLY_TOTAL_KM,
  getCumulativeKm,
  getStageTotalKm,
} from "../data/segments";
import { isShakedownStage } from "../rally.config";
import { formatKm } from "../theme/format";
import {
  labelStyle,
  titleStyle,
  unitStyle,
  valueAccentStyle,
  valueStyle,
} from "../theme/typography";

type Props = {
  segment: Segment;
  /** 0 = caché (avant minimisation), 1 = pleinement visible */
  visibility: number;
};

export const CompactPanel: React.FC<Props> = ({ segment, visibility }) => {
  const isES = segment.type === "ES";
  const isShakedown = isShakedownStage(segment.stage);
  const cumulativeKm = getCumulativeKm(segment.id);
  const stageTotal = getStageTotalKm(segment.stage);
  const stageRatio = Math.min(1, cumulativeKm / stageTotal);
  const timeValue = segment.timeWindow ?? segment.startTime;

  return (
    <div
      style={{
        position: "absolute",
        left: layout.compactMargin,
        bottom: layout.compactMargin,
        width: layout.compactWidth,
        opacity: visibility,
        transform: `translateY(${(1 - visibility) * 30}px)`,
        background: `linear-gradient(180deg, ${colors.panelBgTop}, ${colors.panelBgBottom})`,
        backdropFilter: `blur(${layout.panelBlurPx}px)`,
        borderLeft: `4px solid ${colors.orange}`,
        boxShadow: `0 8px 24px ${colors.shadow}`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: layout.compactPadding,
          gap: layout.compactPadding,
          alignItems: "stretch",
        }}
      >
        {/* Badge type vertical (carré) */}
        <div
          style={{
            background:
              isES && !isShakedown
                ? colors.orange
                : "rgba(255,255,255,0.14)",
            color: colors.white,
            width: isShakedown ? 132 : 96,
            height: 96,
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              ...labelStyle,
              color: colors.white,
              opacity: 0.85,
            }}
          >
            {isShakedown ? "Shakedown" : isES ? "ES" : "Liaison"}
          </span>
          {isES && !isShakedown && (
            <span style={{ ...valueStyle, marginTop: 2 }}>
              {segment.esNumber}
            </span>
          )}
        </div>

        {/* Contenu central */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <span style={labelStyle}>
            {isShakedown
              ? "Essais libres"
              : `Étape ${segment.stage} · Section ${segment.section}`}
          </span>
          <span
            style={{
              ...titleStyle,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isShakedown && isES
              ? "Créneau ouvert"
              : isES
              ? segment.title
              : segment.toLocation}
          </span>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "baseline",
              marginTop: 2,
            }}
          >
            <span style={valueAccentStyle}>
              {formatKm(segment.distanceKm)}
              <span style={unitStyle}>km</span>
            </span>
            <span style={valueStyle}>{timeValue}</span>
          </div>
        </div>
      </div>

      {/* Mini barre de progression de l'étape */}
      <div
        style={{
          height: 4,
          background: "rgba(255, 255, 255, 0.12)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${stageRatio * 100}%`,
            background: gradients.orangeBarHorizontal,
          }}
        />
      </div>

      {/* Footer infos cumul */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: `${layout.compactPadding / 2}px ${layout.compactPadding}px`,
          background: "rgba(0, 0, 0, 0.25)",
        }}
      >
        <span style={labelStyle}>
          {isShakedown ? "Créneau libre" : `Étape ${segment.stage}`} ·{" "}
          {isShakedown
            ? timeValue
            : `${formatKm(cumulativeKm)} / ${formatKm(stageTotal)} km`}
        </span>
        {!isShakedown && (
          <span style={{ ...labelStyle, color: colors.whiteFaint }}>
            Total {formatKm(RALLY_TOTAL_KM)} km
          </span>
        )}
      </div>
    </div>
  );
};
