// Système typographique partagé.
// Chaque style nommé est un objet CSS prêt à utiliser : `style={textStyle}`.
// Les composants n'overrident plus le `fontSize` — la taille est portée par
// le style. Si un cas exceptionnel demande une variation, il vaut mieux créer
// une nouvelle entrée ici plutôt que de patcher inline.

import type { CSSProperties } from "react";
import { colors, fonts } from ".";

const baseFont = fonts.display;

// ─── ÉTIQUETTES (UPPERCASE, espacées) ──────────────────────────────────────

// Default (16 px) — "Total rallye", "Progression étape", header & footer compact
export const labelStyle: CSSProperties = {
  fontFamily: baseFont,
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 2.2,
  textTransform: "uppercase",
  color: colors.whiteSubtle,
};

// Grande (18 px) — "Étape", "Section X"
export const labelLargeStyle: CSSProperties = {
  ...labelStyle,
  fontSize: 18,
};

// Micro (13 px) — labels Distance/Départ/Arrivée
export const labelMicroStyle: CSSProperties = {
  ...labelStyle,
  fontSize: 13,
  letterSpacing: 1.6,
  color: colors.whiteFaint,
};

// Variante orange (basée sur labelLarge — "Section X")
export const labelAccentStyle: CSSProperties = {
  ...labelLargeStyle,
  color: colors.orange,
};

// ─── VALEURS (chiffres, heures, distances) ─────────────────────────────────

// Default (30 px) — Stat value, ES number, time, distance
export const valueStyle: CSSProperties = {
  fontFamily: baseFont,
  fontWeight: 800,
  fontSize: 28,
  color: colors.white,
  lineHeight: 1,
};

// Accent orange (30 px) — Distance accent
export const valueAccentStyle: CSSProperties = {
  ...valueStyle,
  color: colors.orange,
};

// Hero (46 px) — Numéro d'étape (1 / 2)
export const valueHeroStyle: CSSProperties = {
  ...valueStyle,
  fontSize: 46,
};

// Medium (22 px) — Cumul km, Total rallye km (résumés/footer)
export const valueMediumStyle: CSSProperties = {
  ...valueStyle,
  fontSize: 22,
};

// ─── UNITÉ ─────────────────────────────────────────────────────────────────

// Suffixe d'unité (ex. "km") collé à une valeur. La couleur n'est pas fixée
// pour qu'elle hérite du parent (orange si accent, blanc sinon).
export const unitStyle: CSSProperties = {
  fontFamily: baseFont,
  fontWeight: 600,
  fontSize: 18,
  marginLeft: 4,
};

// ─── TITRES ────────────────────────────────────────────────────────────────

// Titre de bloc (30 px) — nom d'ES, toLocation d'une liaison
export const titleStyle: CSSProperties = {
  fontFamily: baseFont,
  fontWeight: 800,
  fontSize: 32,
  color: colors.white,
  letterSpacing: 0.3,
  lineHeight: 1.08,
};

// ─── TEXTE SECONDAIRE / CORPS ──────────────────────────────────────────────

// Corps (20 px) — date
export const bodyStyle: CSSProperties = {
  fontFamily: baseFont,
  fontWeight: 500,
  fontSize: 20,
  color: colors.whiteSubtle,
  letterSpacing: 0.3,
};

// Corps petit (16 px) — nom de section, "Depuis ...", suffixe "/ X km"
export const bodySmallStyle: CSSProperties = {
  ...bodyStyle,
  fontSize: 16,
  color: colors.whiteFaint,
};
