import React from "react";
import { Img, staticFile } from "remotion";

// Logo officiel (version blanc/orange) — déposé dans public/logo.png.
export const Logo: React.FC<{
  width?: number;
  style?: React.CSSProperties;
}> = ({ width = 280, style }) => {
  return (
    <Img
      src={staticFile("logo.png")}
      style={{
        width,
        height: "auto",
        display: "block",
        ...style,
      }}
    />
  );
};
