import React from "react";
import { colors, fonts, layout } from "../theme";
import type { Segment } from "../data/segments";
import {
  RALLY_TOTAL_KM,
  getCumulativeKm,
  getStageTotalKm,
} from "../data/segments";
import { formatKm } from "../format";

type Props = {
  segment: Segment;
  /** 0 = caché (avant minimisation), 1 = pleinement visible */
  visibility: number;
};

export const CompactPanel: React.FC<Props> = ({ segment, visibility }) => {
  const isES = segment.type === "ES";
  const cumulativeKm = getCumulativeKm(segment.id);
  const stageTotal = getStageTotalKm(segment.stage);
  const stageRatio = Math.min(1, cumulativeKm / stageTotal);

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
        borderLeft: `4px solid ${colors.orange}`,
        boxShadow: `0 8px 24px ${colors.shadow}`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: "16px 18px",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Badge type vertical */}
        <div
          style={{
            background: isES ? colors.orange : "rgba(255,255,255,0.14)",
            color: isES ? colors.white : colors.white,
            padding: "10px 14px",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 76,
          }}
        >
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {isES ? "ES" : "Liaison"}
          </span>
          {isES && (
            <span
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: 26,
                lineHeight: 1,
                marginTop: 2,
              }}
            >
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
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 2,
              color: colors.whiteSubtle,
              textTransform: "uppercase",
            }}
          >
            Étape {segment.stage} · Section {segment.section}
          </span>
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: isES ? 22 : 18,
              color: colors.white,
              lineHeight: 1.1,
              letterSpacing: 0.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isES ? segment.title : segment.toLocation}
          </span>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "baseline",
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 18,
                color: colors.orange,
              }}
            >
              {formatKm(segment.distanceKm)}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 11,
                  marginLeft: 3,
                  color: colors.whiteSubtle,
                }}
              >
                km
              </span>
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: 15,
                color: colors.white,
                letterSpacing: 0.5,
              }}
            >
              {segment.startTime}
            </span>
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
            background: `linear-gradient(90deg, ${colors.orange}, #FFB347)`,
          }}
        />
      </div>

      {/* Footer infos cumul */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 18px",
          background: "rgba(0, 0, 0, 0.25)",
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.whiteSubtle,
            textTransform: "uppercase",
          }}
        >
          Étape {segment.stage} · {formatKm(cumulativeKm)} / {formatKm(stageTotal)} km
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.whiteFaint,
            textTransform: "uppercase",
          }}
        >
          Total {formatKm(RALLY_TOTAL_KM)} km
        </span>
      </div>
    </div>
  );
};
