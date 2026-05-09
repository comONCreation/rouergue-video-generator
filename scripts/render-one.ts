/**
 * Rend un seul segment — utile pour itérer rapidement sur le design.
 *
 * Usage :
 *   npm run render:one -- S1-ES1
 *   npm run render:one -- S1-ES1 --duration 12
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { getSegmentById } from "../src/data/segments";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

const main = async () => {
  const args = process.argv.slice(2);
  const segmentId = args[0];
  if (!segmentId) {
    console.error("Usage : npm run render:one -- <segmentId> [--duration N]");
    process.exit(1);
  }

  const seg = getSegmentById(segmentId);
  if (!seg) {
    console.error(`Segment ${segmentId} introuvable.`);
    process.exit(1);
  }

  let duration = 30;
  const dIdx = args.indexOf("--duration");
  if (dIdx >= 0 && args[dIdx + 1]) duration = Number(args[dIdx + 1]);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📦 Bundling…`);
  const bundled = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: (c) => c,
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: seg.id,
  });

  const outputPath = path.join(OUT_DIR, `${seg.id}.mov`);

  console.log(`🎬 Rendu ${seg.id} (${duration}s) → ${outputPath}`);

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: Math.round(duration * composition.fps),
    },
    serveUrl: bundled,
    codec: "prores",
    proResProfile: "4444",
    pixelFormat: "yuva444p10le",
    outputLocation: outputPath,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  ${Math.round(progress * 100)}%   `);
    },
  });

  console.log(`\n✅ ${outputPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
