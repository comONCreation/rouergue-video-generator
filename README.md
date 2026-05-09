# Videos Rallye Aveyron Rouergue Occitanie 2026

Génération de vidéos complètes Mapbox + overlay pour chaque liaison et spéciale.
L'ancien rendu alpha seul reste disponible pour une incrustation dans Final Cut Pro.

## Stack

- Remotion 4 + React 19 + TypeScript
- Mapbox GL JS pour les fonds de carte et la caméra animée
- Police : Montserrat (via `@remotion/google-fonts`)
- Format : 1920×1080 @ 60 fps

## Installation

```bash
npm install
```

Créer ensuite un fichier `.env` avec le token Mapbox :

```bash
REMOTION_MAPBOX_TOKEN=pk...
```

Optionnel :

```bash
REMOTION_MAPBOX_STYLE=mapbox://styles/mapbox/outdoors-v12
```

## Workflow

### 1. Prévisualiser dans le studio Remotion

```bash
npm run dev
```

Ouvre le studio. Chaque segment a sa propre composition (ex. `S1-ES1`,
`S1-L02`, `S2-ES15`) avec carte Mapbox, tracé GPX et overlay.
Les compositions `OVERLAY-S1-ES1`, etc. gardent l'ancien mode fond transparent.

### 2. Rendre un seul segment (itération rapide)

```bash
npm run render:one -- S1-ES1
npm run render:one -- S1-ES1 --duration 15
npm run render:one -- S1-ES1 --overlay
```

### 3. Rendre tous les segments en lot

```bash
npm run render:all
npm run render:all -- --duration 45
npm run render:all -- --only S1-ES1,S2-ES15
npm run render:all -- --overlay
```

Sortie dans `out/` au format `.mp4` pour les vidéos complètes. Le mode
`--overlay` sort des `.mov` ProRes 4444 avec canal alpha.

### 4. Durées personnalisées par segment

Créer un fichier `durations.json` à la racine pour matcher la durée de chaque
clip au seconde près :

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
  data/gpxFiles.ts     → correspondance segment → fichier GPX
  data/segments.ts     → données extraites du Road Book (TIMING R26.pdf)
  components/          → carte Mapbox + blocs du panneau gauche
  gpx.ts               → parsing GPX + helpers de progression caméra
  theme.ts             → couleurs charte + dimensions
  SegmentMapVideo.tsx  → composition carte + overlay
  SegmentOverlay.tsx   → overlay alpha historique
  Root.tsx             → enregistrement Remotion
scripts/
  render-one.ts        → rendu d'un segment unique
  render-all.ts        → rendu en lot
public/GPX/            → traces et points GPX
out/                   → vidéos générées
```

## Charte respectée

- Bleu : `#0F5699` · Orange : `#F59E20`
- Liaisons : tracé bleu
- Spéciales : tracé orange
- Pins GPX : départ, arrivée et zones publiques depuis `public/Drapeaux/`
- Logo : fallback SVG (volant + cornes + "52") — à remplacer par le vrai logo
  dans `src/components/Logo.tsx` quand le SVG sera disponible.
