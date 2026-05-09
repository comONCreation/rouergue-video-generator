import React from "react";
import { colors, fonts } from "../theme";
import { formatKm } from "../format";

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
      <span
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 2.2,
          color: colors.whiteSubtle,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

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
            background: `linear-gradient(90deg, ${colors.orange}, #FFB347)`,
            borderRadius: 5,
            boxShadow: `0 0 14px ${colors.orange}`,
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 18,
            color: colors.white,
          }}
        >
          {formatKm(cumulativeKm)} km
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 14,
            color: colors.whiteSubtle,
          }}
        >
          / {formatKm(totalKm)} km
        </span>
      </div>
    </div>
  );
};
