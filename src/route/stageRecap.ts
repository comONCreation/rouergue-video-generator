import { isShakedownStage } from "../rally.config";
import { layout, stageRecap } from "../theme";

// Le récap de fin d'étape ne s'applique qu'aux étapes officielles du rallye
// (étapes 1 et 2). Le shakedown n'en a pas.
export const stageHasRecap = (stage: number): boolean =>
  !isShakedownStage(stage);

// Durée (en frames) ajoutée à la fin d'une vidéo d'étape pour le récap.
// Calcul partagé entre Root.tsx (métadonnées de durée) et FullStageVideo
// (placement de la séquence), pour rester parfaitement synchronisés.
export const getStageRecapDurationInFrames = (
  stage: number,
  fps: number = layout.fps
): number =>
  stageHasRecap(stage)
    ? Math.round(stageRecap.durationSeconds * fps)
    : 0;
