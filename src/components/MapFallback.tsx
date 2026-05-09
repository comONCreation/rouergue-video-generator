import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";

export const MapFallback: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(135deg, #07111f 0%, #0f335a 56%, #2e4660 100%)",
      color: colors.white,
      fontFamily: fonts.display,
      fontSize: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: 80,
    }}
  >
    {children}
  </AbsoluteFill>
);
