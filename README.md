# Overlays Rallye Aveyron Rouergue Occitanie 2026

Génération d'overlays alpha (ProRes 4444 .mov) pour incrustation dans Final Cut Pro
par-dessus les sous-vidéos AvoMap du tracé.

## Stack

- Remotion 4 + React 19 + TypeScript
- Police : Montserrat (via `@remotion/google-fonts`)
- Format : 1920×1080 @ 60 fps, fond transparent

## Installation

```bash
npm install
```

## Workflow

### 1. Prévisualiser dans le studio Remotion

```bash
npm run dev
```

Ouvre le studio. Chaque segment a sa propre composition (ex. `S1-ES1`,
`S1-L02`, `S2-ES15`) — il suffit de la sélectionner dans la liste.

### 2. Rendre un seul segment (itération rapide)

```bash
npm run render:one -- S1-ES1
npm run render:one -- S1-ES1 --duration 15
```

### 3. Rendre tous les segments en lot

```bash
npm run render:all
npm run render:all -- --duration 45
npm run render:all -- --only S1-ES1,S2-ES15
```

Sortie dans `out/` au format ProRes 4444 avec canal alpha.

### 4. Durées personnalisées par segment

Créer un fichier `durations.json` à la racine pour matcher la durée de chaque
clip AvoMap au seconde près :

```json
{
  "S1-L01": 65,
  "S1-L02": 80,
  "S1-ES1": 18,
  "S1-L03": 30
}
```

`render-all.ts` lit ce fichier s'il existe et applique la durée par segment ;
les segments absents utilisent la durée par défaut (`--duration` ou 30s).

## Structure

```
src/
  data/segments.ts     → données extraites du Road Book (TIMING R26.pdf)
  components/          → blocs du panneau gauche
  theme.ts             → couleurs charte + dimensions
  SegmentOverlay.tsx   → composition principale
  Root.tsx             → enregistrement Remotion
scripts/
  render-one.ts        → rendu d'un segment unique
  render-all.ts        → rendu en lot
out/                   → fichiers .mov générés (à incruster dans FCP)
```

## Charte respectée

- Bleu : `#0F5699` · Orange : `#F59E20`
- Logo : fallback SVG (volant + cornes + "52") — à remplacer par le vrai logo
  dans `src/components/Logo.tsx` quand le SVG sera disponible.
