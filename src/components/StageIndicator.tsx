import React from "react";
import { colors } from "../theme";
import { TOTAL_SECTIONS } from "../data/segments";
import { STAGE_COUNT, isShakedownStage } from "../rally.config";
import {
  bodyStyle,
  bodySmallStyle,
  labelAccentStyle,
  labelLargeStyle,
  valueHeroStyle,
  valueMediumStyle,
} from "../theme/typography";

type Props = {
  stage: number;
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
  const shakedown = isShakedownStage(stage);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {shakedown ? (
        <span style={valueHeroStyle}>Shakedown</span>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={labelLargeStyle}>Étape</span>
          <span style={valueHeroStyle}>{stage}</span>
          <span
            style={{
              ...valueMediumStyle,
              fontWeight: 600,
              color: colors.whiteFaint,
            }}
          >
            / {STAGE_COUNT}
          </span>
        </div>
      )}

      <span style={bodyStyle}>{date}</span>

      {!shakedown && (
        <>
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
              gap: 4,
              marginTop: 4,
            }}
          >
            <span style={labelAccentStyle}>Section {section}</span>
            <span style={bodySmallStyle}>{sectionName}</span>
          </div>
        </>
      )}
    </div>
  );
};
