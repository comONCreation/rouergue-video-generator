import React from "react";
import { colors, fonts } from "../theme";
import type { Segment } from "../data/segments";
import { formatKm } from "../theme/format";
import { isShakedownStage } from "../rally.config";
import {
  bodySmallStyle,
  labelMicroStyle,
  titleStyle,
  unitStyle,
  valueAccentStyle,
  valueStyle,
} from "../theme/typography";

export const SegmentBlock: React.FC<{ segment: Segment }> = ({ segment }) => {
  const isES = segment.type === "ES";
  const isShakedown = isShakedownStage(segment.stage);
  const typeLabel = isShakedown
    ? "Shakedown"
    : isES
    ? `ES ${segment.esNumber}`
    : "Liaison";
  const title =
    isShakedown && isES
      ? "Essais libres"
      : isES
      ? segment.title
      : `→ ${segment.toLocation}`;
  const timeLabel = isShakedown ? "Créneau" : isES ? "Départ ES" : "Départ";
  const timeValue = segment.timeWindow ?? segment.startTime;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.32)",
        borderLeft: `4px solid ${colors.orange}`,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Type badge + état */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: isES ? colors.orange : colors.white,
            color: isES ? colors.white : colors.blue,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 1.6,
            padding: "6px 14px",
            borderRadius: 4,
            textTransform: "uppercase",
          }}
        >
          {typeLabel}
        </div>
        {segment.badge && !isShakedown && (
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1.4,
              color: colors.orange,
              textTransform: "uppercase",
              border: `1px solid ${colors.orange}`,
              padding: "9px 14px",
              borderRadius: 4,
            }}
          >
            {segment.badge}
          </span>
        )}
      </div>

      {/* Titre */}
      <div style={titleStyle}>{title}</div>

      {/* "Depuis ..." pour les liaisons */}
      {!isES && segment.fromLocation && !isShakedown && (
        <div
          style={{
            ...bodySmallStyle,
            lineHeight: 1.3,
            marginTop: -4,
          }}
        >
          Depuis {segment.fromLocation}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 22,
          marginTop: 6,
          flexWrap: "wrap",
        }}
      >
        <Stat
          label="Distance"
          value={formatKm(segment.distanceKm)}
          unit="km"
          accent
        />
        <Stat label={timeLabel} value={timeValue} />
        {!isES && segment.endTime && !isShakedown && (
          <Stat label="Arrivée" value={segment.endTime} />
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}> = ({ label, value, unit, accent }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span style={labelMicroStyle}>{label}</span>
    <span style={accent ? valueAccentStyle : valueStyle}>
      {value}
      {unit && <span style={unitStyle}>{unit}</span>}
    </span>
  </div>
);
