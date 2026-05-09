/**
 * Rend tous les segments en ProRes 4444 avec canal alpha (.mov).
 *
 * Usage :
 *   npm run render:all
 *   npm run render:all -- --duration 45      (durée par défaut en secondes)
 *   npm run render:all -- --only S1-ES1,S2-ES15
 *
 * Pour gérer des durées par segment, créer un fichier `durations.json` à la racine :
 *   { "S1-ES1": 18, "S1-L01": 60, ... }
 * Le script l'utilisera s'il est présent.
 */
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { SEGMENTS, type Segment } from "../src/data/segments";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const DURATIONS_FILE = path.join(ROOT, "durations.json");

type Args = {
  duration: number;
  only: string[] | null;
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  let duration = 30;
  let only: string[] | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--duration" && args[i + 1]) {
      duration = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--only" && args[i + 1]) {
      only = args[i + 1].split(",").map((s) => s.trim());
      i++;
    }
  }
  return { duration, only };
};

const loadCustomDurations = (): Record<string, number> => {
  if (!fs.existsSync(DURATIONS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DURATIONS_FILE, "utf8"));
  } catch (err) {
    console.warn("Impossible de lire durations.json :", err);
    return {};
  }
};

const safeFilename = (segment: Segment, index: number) => {
  const slug = segment.toLocation
    ? segment.toLocation
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    : segment.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
  const idx = String(index + 1).padStart(2, "0");
  return `${segment.stage}-${idx}-${segment.id}-${slug}.mov`;
};

const main = async () => {
  const { duration: defaultDuration, only } = parseArgs();
  const customDurations = loadCustomDurations();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = only
    ? SEGMENTS.filter((s) => only.includes(s.id))
    : SEGMENTS;

  if (targets.length === 0) {
    console.error("Aucun segment à rendre.");
    process.exit(1);
  }

  console.log(`📦 Bundling Remotion…`);
  const bundled = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: (c) => c,
  });

  console.log(`🎬 Rendu de ${targets.length} segment(s)…\n`);

  for (let i = 0; i < targets.length; i++) {
    const seg = targets[i];
    const segmentDuration = customDurations[seg.id] ?? defaultDuration;

    console.log(
      `[${i + 1}/${targets.length}] ${seg.id} — ${seg.title} (${segmentDuration}s)`
    );

    const composition = await selectComposition({
      serveUrl: bundled,
      id: seg.id,
    });

    // Override de la durée pour matcher la vidéo AvoMap
    const composedWithDuration = {
      ...composition,
      durationInFrames: Math.round(segmentDuration * composition.fps),
    };

    const outputPath = path.join(OUT_DIR, safeFilename(seg, i));

    await renderMedia({
      composition: composedWithDuration,
      serveUrl: bundled,
      codec: "prores",
      proResProfile: "4444",
      // Alpha activé via la transparence du composition (backgroundColor: transparent)
      pixelFormat: "yuva444p10le",
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  ${Math.round(progress * 100)}%   `);
      },
    });

    console.log(`\n  ✅ ${path.relative(ROOT, outputPath)}`);
  }

  console.log(`\n✨ Terminé. Sortie : ${path.relative(ROOT, OUT_DIR)}/`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
