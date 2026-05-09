/**
 * Rend un seul segment — utile pour itérer rapidement sur le design.
 *
 * Usage :
 *   npm run render:one -- S1-ES1
 *   npm run render:one -- S1-ES1 --duration 12
 *   npm run render:one -- S1-ES1 --overlay
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import {
  computeSegmentDurationSeconds,
  getSegmentById,
} from "../src/data/segments";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

const ENV_FILE = path.join(ROOT, ".env");
if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

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

  let duration = computeSegmentDurationSeconds(seg);
  const dIdx = args.indexOf("--duration");
  if (dIdx >= 0 && args[dIdx + 1]) duration = Number(args[dIdx + 1]);
  const overlayOnly = args.includes("--overlay");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📦 Bundling…`);
  const bundled = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: (c) => c,
  });

  const compositionId = overlayOnly ? `OVERLAY-${seg.id}` : seg.id;
  const envVariables = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[0].startsWith("REMOTION_") && typeof entry[1] === "string"
    )
  );

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    envVariables,
    chromiumOptions: { gl: "angle" },
  });

  const outputPath = path.join(
    OUT_DIR,
    overlayOnly ? `${seg.id}-overlay.mov` : `${seg.id}.mov`
  );

  console.log(
    `🎬 Rendu ${compositionId} (${duration}s) → ${outputPath}`
  );

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: Math.round(duration * composition.fps),
    },
    serveUrl: bundled,
    codec: "prores",
    proResProfile: overlayOnly ? ("4444" as const) : ("hq" as const),
    ...(overlayOnly
      ? { pixelFormat: "yuva444p10le" as const }
      : {}),
    imageFormat: "png",
    envVariables,
    chromiumOptions: { gl: "angle" },
    timeoutInMilliseconds: 120000,
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
