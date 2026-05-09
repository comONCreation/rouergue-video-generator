import React from "react";
import { colors, fonts } from "../theme";
import type { Segment } from "../data/segments";

const formatKm = (km: number) =>
  km.toLocaleString("fr-FR", {
    minimumFractionDigits: km < 10 ? 3 : 2,
    maximumFractionDigits: 3,
  });

export const SegmentBlock: React.FC<{ segment: Segment }> = ({ segment }) => {
  const isES = segment.type === "ES";

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.32)",
        borderLeft: `4px solid ${colors.orange}`,
        borderRadius: 6,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Type badge + état */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            background: isES ? colors.orange : colors.white,
            color: isES ? colors.white : colors.blue,
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: 1.6,
            padding: "6px 14px",
            borderRadius: 4,
            textTransform: "uppercase",
          }}
        >
          {isES ? `ES ${segment.esNumber}` : "Liaison"}
        </div>
        {segment.badge && (
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 1.4,
              color: colors.orange,
              textTransform: "uppercase",
              border: `1px solid ${colors.orange}`,
              padding: "4px 8px",
              borderRadius: 3,
            }}
          >
            {segment.badge}
          </span>
        )}
      </div>

      {/* Titre */}
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: isES ? 36 : 22,
          color: colors.white,
          lineHeight: 1.08,
          letterSpacing: isES ? 0.2 : 0.4,
          textTransform: isES ? "uppercase" : "none",
        }}
      >
        {isES ? segment.title : `→ ${segment.toLocation}`}
      </div>

      {/* From → To pour les liaisons */}
      {!isES && segment.fromLocation && (
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 500,
            fontSize: 13,
            color: colors.whiteFaint,
            letterSpacing: 0.3,
            lineHeight: 1.3,
            marginTop: -8,
          }}
        >
          Depuis {segment.fromLocation}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 22, marginTop: 6, flexWrap: "wrap" }}>
        <Stat
          label="Distance"
          value={formatKm(segment.distanceKm)}
          unit="km"
          accent
        />
        <Stat
          label={isES ? "Départ ES" : "Départ"}
          value={segment.startTime}
        />
        {!isES && segment.endTime && (
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
    <span
      style={{
        fontFamily: fonts.display,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 1.6,
        color: colors.whiteFaint,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: accent ? 28 : 24,
        color: accent ? colors.orange : colors.white,
        lineHeight: 1,
      }}
    >
      {value}
      {unit && (
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: colors.whiteSubtle,
            marginLeft: 4,
          }}
        >
          {unit}
        </span>
      )}
    </span>
  </div>
);
