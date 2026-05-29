import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, stageRecap } from "../theme";
import type { StagedRoute } from "../route/stagedRoute";
import { StageRecapMap } from "./StageRecapMap";
import { StageRecapOverlay } from "./StageRecapOverlay";
import { PlaqueBug } from "./Plaque";

type Props = {
  stage: number;
  route: StagedRoute;
};

// Récap de fin d'étape : carte complète figée + panneau des kilométrages.
// Le fondu d'entrée enchaîne en douceur depuis la vue cinématique finale.
export const StageRecap: React.FC<Props> = ({ stage, route }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, Math.round(stageRecap.fadeInSeconds * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: colors.background }}>
      <StageRecapMap route={route} />
      <StageRecapOverlay stage={stage} />
      <PlaqueBug />
    </AbsoluteFill>
  );
};
