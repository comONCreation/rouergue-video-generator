import React from "react";
import { colors, gradients } from "../theme";
import { formatKm } from "../theme/format";
import { bodySmallStyle, labelStyle, valueMediumStyle } from "../theme/typography";

type Props = {
  cumulativeKm: number;
  totalKm: number;
  label?: string;
};

export const StageProgress: React.FC<Props> = ({
  cumulativeKm,
  totalKm,
  label = "Progression de l'étape",
}) => {
  const ratio = Math.min(1, Math.max(0, cumulativeKm / totalKm));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={labelStyle}>{label}</span>

      <div
        style={{
          height: 10,
          background: "rgba(255, 255, 255, 0.12)",
          borderRadius: 5,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${ratio * 100}%`,
            background: gradients.orangeBarHorizontal,
            borderRadius: 5,
            boxShadow: `0 0 14px ${colors.orange}`,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={valueMediumStyle}>{formatKm(cumulativeKm)} km</span>
        <span style={bodySmallStyle}>/ {formatKm(totalKm)} km</span>
      </div>
    </div>
  );
};
