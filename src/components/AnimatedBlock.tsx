import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

// Anime un bloc avec un slide-up + fade-in décalé.
export const AnimatedBlock: React.FC<{
  delay: number;
  initialOpacity?: number;
  offsetY?: number;
  children: React.ReactNode;
}> = ({ delay, initialOpacity = 0, offsetY = 14, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.6 },
  });
  return (
    <div
      style={{
        opacity: initialOpacity + (1 - initialOpacity) * progress,
        transform: `translateY(${(1 - progress) * offsetY}px)`,
      }}
    >
      {children}
    </div>
  );
};
