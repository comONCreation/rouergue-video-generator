# Vidéos Rallye Aveyron Rouergue Occitanie 2026

Génération vidéo du tracé du 52ᵉ Rallye Aveyron Rouergue Occitanie. Trois
livrables :

- **Vidéos par segment** — une par ES et par liaison (`S1-ES1`, `S1-L02`,
  `S2-ES15`, …) avec carte Mapbox, tracé GPX et panneau d'information.
- **Vidéo continue par étape** — `FULL-S1` (Étape 1) et `FULL-S2` (Étape 2)
  enchaînent toute l'étape sans coupure : caméra cinématique qui suit la
  trace, holds aux key points (départ/arrivée d'étape, départ/arrivée
  d'ES, assistance, regroupement) et overlay qui se met à jour à chaque
  segment traversé.
- **Export rallye complet** — `npm run render:concat` rend `FULL-S0`,
  `FULL-S1` et `FULL-S2` séparément, puis les assemble avec un fondu au noir
  via FFmpeg pour produire `out/FULL-ROUERGUE.mp4`. `npm run render:full`
  exporte directement `FULL-ROUERGUE` en H.264 avec la CLI Remotion standard.
- **Studio Remotion** — prévisualisation interactive de toutes les
  compositions avec timeline.

## Stack

- Remotion 4.0 + React 19 + TypeScript 5
- Mapbox GL JS pour les fonds de carte et la caméra animée
- Police Montserrat (`@remotion/google-fonts`)
- Sortie : 1920×1080 @ 60 fps, ProRes HQ (`.mov`) via la CLI Remotion

## Installation

```bash
npm install
```

Créer un fichier `.env` à la racine avec le token Mapbox :

```bash
REMOTION_MAPBOX_TOKEN=pk...
```

Optionnel (style Mapbox custom, sinon `outdoors-v12` par défaut) :

```bash
REMOTION_MAPBOX_STYLE=mapbox://styles/mapbox/outdoors-v12
```

## Workflow

### Prévisualisation dans le studio Remotion

```bash
npm run dev
```

Ouvre le studio. Toutes les compositions (par segment et par étape) y sont
listées et scrubbables.

### Rendu avec la CLI Remotion

```bash
npm run render -- S1-ES1      # un segment unitaire
npm run render -- FULL-S1     # étape 1 complète, en continu
npm run render -- FULL-S2     # étape 2 complète, en continu
npm run render:full           # export direct H.264 de FULL-ROUERGUE
npm run render:concat         # export stable : étapes séparées + assemblage
```

La commande utilise la CLI Remotion standard (`remotion render`). Les paramètres
d'export sont centralisés dans `remotion.config.ts` : ProRes HQ, frames JPEG 95,
pixel format `yuv422p10le`, espace couleur BT.709 et concurrence limitée à 1
pour préserver la stabilité des chargements Mapbox satellite.

`npm run render:concat` ne rend plus la composition `FULL-ROUERGUE` d'un seul
bloc. Le script rend les parties dans `out/full-rally-parts/` sans proxy-cache
Mapbox local, puis utilise FFmpeg pour appliquer les fondus noirs et
assembler `out/FULL-ROUERGUE.mp4` en H.264, `yuv420p`, preset x264 `slow`
et bitrate vidéo cible `32M`. Le script privilégie le FFmpeg système pour
l'assemblage, car le FFmpeg embarqué par Remotion ne contient pas tous les
filtres vidéo nécessaires aux fondus. La composition `FULL-ROUERGUE` reste
disponible dans le Studio pour prévisualiser l'enchaînement.

`npm run render:full` exécute l'export direct H.264 de `FULL-ROUERGUE`, sans
intermédiaires ProRes ni assemblage FFmpeg :

```bash
REMOTION_EXPORT_PRESET=h264 npm run render -- FULL-ROUERGUE
```

Pour choisir le fichier de sortie :

```bash
npm run render:full -- out/FULL-ROUERGUE-direct.mp4
```

Options utiles :

```bash
npm run render:concat -- out/exports/rouergue.mp4
REMOTION_FULL_RALLY_SKIP_RENDER=1 npm run render:concat
REMOTION_FULL_RALLY_STAGE_PRESET=h264 npm run render:concat
REMOTION_FULL_RALLY_X264_PRESET=veryfast npm run render:concat
```

Sans chemin de sortie explicite, Remotion écrit automatiquement dans `out/` :
`npm run render -- S1-ES1` produit `out/S1-ES1.mov`.

Pour choisir un fichier précis :

```bash
npm run render -- S1-ES1 out/segments/S1-ES1.mov
```

Pour rendre plusieurs compositions, lancer la commande pour chaque ID voulu :

```bash
npm run render -- S1-ES1
npm run render -- S1-L02
npm run render -- S2-ES15
```

La durée des compositions est calculée automatiquement à partir des distances et
des vitesses caméra définies dans `theme.ts`
(`mapCamera.cameraSpeed.es` / `.liaison`).

## Comment ça marche (étape continue)

L'étape complète est construite à la volée dans le studio :

1. **Fusion des GPX** — `loadStagedRoute` charge en parallèle tous les GPX
   de l'étape, déduplique les points coïncidents aux jonctions et produit
   une route continue avec les distances cumulées.
2. **Timeline caméra** — `buildStageTimeline` extrait les key points
   (départ/arrivée d'étape, ES, assistance, regroupement) et planifie
   l'alternance hold (caméra immobile) ↔ transit (caméra qui suit la
   trace), avec vitesse différenciée ES vs liaison.
3. **Caméra cinématique** — center + bearing avancent en lookahead,
   lissés avec un filtre half-life pour éviter les soubresauts dans les
   épingles serrées.
4. **Tracé adaptatif** — au-delà de quelques segments parcourus, le tracé
   passé disparaît de la carte, ce qui évite la superposition visuelle
   quand l'étape reboucle sur les mêmes routes (typique des boucles
   Espalion / La Primaube).
5. **Pins waypoints dynamiques** — un même lieu (ex. parc fermé Bourran)
   apparaît dans plusieurs GPX consécutifs ; un clustering par proximité
   produit un seul pin, dont le libellé change selon le segment courant
   ("Arrivée Liaison" → "Départ ES…").
6. **Overlay segment** — l'overlay (panneau gauche + bandeau compact)
   rejoue son animation à chaque entrée d'un nouveau segment, ce qui
   permet aux boucles de ré-afficher l'info.

Tous les paramètres (vitesses caméra, durées des holds, lissage,
zoom/pitch, géométrie du tracé) sont dans [`src/theme.ts`](src/theme.ts) :

- `mapCamera.segmentVideo.introOutroHoldSeconds` — hold de la caméra au
  début et à la fin des **vidéos par segment**.
- `mapCamera.stageVideo.keyPointHolds` — durées des holds aux key points
  sur les **vidéos d'étape continue**.
- `mapCamera.cameraSpeed.{es,liaison}` — vitesse de la caméra en transit.
- `mapCamera.cinematic.*` — paramètres de lissage center/bearing.

## Structure

```
src/
  Root.tsx               → enregistrement des compositions Remotion
  SegmentMapVideo.tsx    → composition par segment (carte + overlay)
  FullRallyVideo.tsx     → composition continue par étape (FULL-S1/S2)
  SegmentOverlay.tsx     → panneau overlay (réutilisé par les deux)
  stagedRoute.ts         → fusion des GPX en route continue
  stageTimeline.ts       → timeline caméra (holds + transits)
  cameraPath.ts          → helpers caméra/bearing partagés
  gpx.ts                 → parsing GPX + helpers de progression
  theme.ts               → couleurs, dimensions, paramètres caméra
  typography.ts          → styles de texte centralisés
  format.ts              → formatage km / temps
  data/
    segments.ts          → métadonnées des segments (Road Book TIMING R26)
    gpxFiles.ts          → segment → fichier GPX
  components/
    RallyMap.tsx         → carte Mapbox pour un segment
    ContinuousStageMap.tsx → carte Mapbox pour une étape continue
    MapFallback.tsx      → écran d'erreur partagé
    LeftPanel.tsx        → panneau d'info principal
    CompactPanel.tsx     → bandeau compact (après minimisation)
    StageIndicator.tsx   → en-tête étape/section
    SegmentBlock.tsx     → bloc d'info segment
    StageProgress.tsx    → barre de progression d'étape
    Logo.tsx             → logo du rallye
public/
  GPX/                   → traces et points GPX par étape
  markers/               → pins (départ/arrivée/zone publique)
  logo.png
out/                     → vidéos générées
```

## Charte

- Bleu : `#0F5699` · Orange : `#F59E20`
- Liaisons : tracé bleu
- Spéciales : tracé orange
- Pins GPX : départ / arrivée / zone publique (`public/markers/`)
- Logo : `public/logo.png` (fallback SVG dans `Logo.tsx`)
