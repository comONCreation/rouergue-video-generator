import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, gradients } from "../theme";

export const MapFallback: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      background: gradients.statusBackdrop,
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
