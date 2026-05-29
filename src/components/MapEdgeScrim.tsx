import React from "react";
import { AbsoluteFill } from "remotion";

// Voile d'assombrissement du bord gauche, posé par-dessus la carte (scrim).
// Va de sombre à gauche à totalement transparent à droite, pour détacher le
// panneau et les overlays de la carte. Partagé par la carte d'étape continue
// et le récap figé, afin de garder un rendu identique entre les deux.
export const MapEdgeScrim: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "linear-gradient(90deg, rgba(5, 14, 28, 0.44) 0%, rgba(5, 14, 28, 0.22) 27%, rgba(5, 14, 28, 0) 62%)",
    }}
  />
);
