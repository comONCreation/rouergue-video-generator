import React from "react";
import { colors, fonts } from "../theme";
import { TOTAL_SECTIONS } from "../data/segments";

type Props = {
  stage: 1 | 2;
  date: string;
  section: number;
  sectionName: string;
};

export const StageIndicator: React.FC<Props> = ({
  stage,
  date,
  section,
  sectionName,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 2.4,
            color: colors.whiteSubtle,
            textTransform: "uppercase",
          }}
        >
          Étape
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 38,
            color: colors.white,
            lineHeight: 1,
          }}
        >
          {stage}
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 18,
            color: colors.whiteFaint,
            lineHeight: 1,
          }}
        >
          / 2
        </span>
      </div>
      <span
        style={{
          fontFamily: fonts.display,
          fontWeight: 500,
          fontSize: 16,
          color: colors.whiteSubtle,
          letterSpacing: 0.4,
        }}
      >
        {date}
      </span>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => {
          const n = i + 1;
          const active = n === section;
          const done = n < section;
          return (
            <div
              key={n}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                background: active
                  ? colors.orange
                  : done
                  ? "rgba(245, 158, 32, 0.55)"
                  : "rgba(255, 255, 255, 0.18)",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 2.2,
            color: colors.orange,
            textTransform: "uppercase",
          }}
        >
          Section {section}
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 500,
            fontSize: 13,
            color: colors.whiteFaint,
            letterSpacing: 0.3,
          }}
        >
          {sectionName}
        </span>
      </div>
    </div>
  );
};
