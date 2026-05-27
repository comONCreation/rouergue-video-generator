import { mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

const DEFAULT_OUTPUT = "out/FULL-ROUERGUE.mp4";
const DEFAULT_STAGES = "0,1,2";
const DEFAULT_TRANSITION_SECONDS = 1.2;
const DEFAULT_STAGE_TIMEOUT_MS = 120000;
const DEFAULT_X264_PRESET = "slow";

const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log(`Usage: npm run render:concat -- [output] [remotion args...]

Rend FULL-S0, FULL-S1 et FULL-S2 separement, puis assemble le rallye complet
avec un fondu noir entre les parties via FFmpeg.

Variables utiles:
  REMOTION_FULL_RALLY_STAGES=0,1,2
  REMOTION_FULL_RALLY_PARTS_DIR=out/full-rally-parts
  REMOTION_FULL_RALLY_STAGE_PRESET=prores|h264
  REMOTION_FULL_RALLY_SKIP_RENDER=1
  REMOTION_FULL_RALLY_TRANSITION_SECONDS=1.2
  REMOTION_FULL_RALLY_FFMPEG=ffmpeg
  REMOTION_FULL_RALLY_FINAL_ENCODER=libx264|h264_videotoolbox
  REMOTION_FULL_RALLY_VIDEO_BITRATE=32M
  REMOTION_FULL_RALLY_X264_PRESET=slow
`);
  process.exit(0);
}

const output =
  rawArgs[0] && !rawArgs[0].startsWith("-") ? rawArgs.shift() : DEFAULT_OUTPUT;
const extraRenderArgs = rawArgs;

const stages = (process.env.REMOTION_FULL_RALLY_STAGES ?? DEFAULT_STAGES)
  .split(",")
  .map((stage) => stage.trim())
  .filter(Boolean)
  .map((stage) => (stage.startsWith("FULL-S") ? stage : `FULL-S${stage}`));

if (stages.length === 0) {
  throw new Error("Aucune composition a rendre pour le rallye complet.");
}

const partsDir =
  process.env.REMOTION_FULL_RALLY_PARTS_DIR ?? "out/full-rally-parts";
const stagePreset = process.env.REMOTION_FULL_RALLY_STAGE_PRESET ?? "prores";
const stageExtension = stagePreset === "h264" ? "mp4" : "mov";
const shouldSkipRender = process.env.REMOTION_FULL_RALLY_SKIP_RENDER === "1";
const transitionSeconds = Number(
  process.env.REMOTION_FULL_RALLY_TRANSITION_SECONDS ??
    DEFAULT_TRANSITION_SECONDS
);
const transitionHalfSeconds = Math.max(0, transitionSeconds / 2);
const finalBitrate = process.env.REMOTION_FULL_RALLY_VIDEO_BITRATE ?? "32M";
const x264Preset =
  process.env.REMOTION_FULL_RALLY_X264_PRESET ?? DEFAULT_X264_PRESET;
const requestedFfmpeg = process.env.REMOTION_FULL_RALLY_FFMPEG ?? "ffmpeg";
const finalEncoder = process.env.REMOTION_FULL_RALLY_FINAL_ENCODER ?? "libx264";

if (!["prores", "h264"].includes(stagePreset)) {
  throw new Error(
    `REMOTION_FULL_RALLY_STAGE_PRESET doit valoir "prores" ou "h264", recu "${stagePreset}".`
  );
}

if (!Number.isFinite(transitionSeconds) || transitionSeconds < 0) {
  throw new Error(
    `REMOTION_FULL_RALLY_TRANSITION_SECONDS invalide: ${transitionSeconds}.`
  );
}

const remotionBin = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion"
);

const assemblyCommand =
  requestedFfmpeg === "remotion" ? remotionBin : requestedFfmpeg;
const assemblyPrefix = requestedFfmpeg === "remotion" ? ["ffmpeg"] : [];

const hasTimeoutArg = extraRenderArgs.some(
  (arg) => arg === "--timeout" || arg.startsWith("--timeout=")
);

const run = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    if (options.stdio !== "ignore") {
      console.log(`\n${label}`);
      logCommand(command, args);
    }

    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} interrompu par ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${label} termine avec le code ${code}`));
        return;
      }

      resolve();
    });
  });

const capture = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "inherit"],
      ...options,
    });

    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} interrompu par ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${label} termine avec le code ${code}`));
        return;
      }

      resolve(stdout);
    });
  });

const quoteArg = (arg) => (/[\s;[\]'"]/u.test(arg) ? JSON.stringify(arg) : arg);

const logCommand = (command, args) =>
  console.log([command, ...args].map(quoteArg).join(" "));

const ensureAssemblerCanFade = async () => {
  if (transitionSeconds <= 0) return;

  const args = [
    ...assemblyPrefix,
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=red:s=320x180:d=1:r=30",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=320x180:d=1:r=30",
    "-filter_complex",
    "[0:v]setpts=PTS-STARTPTS,fade=t=out:st=0.5:d=0.2:color=black,format=yuv420p[v0];[1:v]setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.2:color=black,format=yuv420p[v1];[v0][v1]concat=n=2:v=1:a=0[v]",
    "-map",
    "[v]",
    "-frames:v",
    "1",
    "-f",
    "null",
    "-",
  ];

  await run("Verification FFmpeg assemblage", assemblyCommand, args, {
    stdio: "ignore",
  }).catch((error) => {
    throw new Error(
      [
        "L'assembleur FFmpeg configure ne supporte pas les filtres video necessaires aux fondus.",
        `Commande test: ${[assemblyCommand, ...args].map(quoteArg).join(" ")}`,
        "Utilise le FFmpeg systeme avec REMOTION_FULL_RALLY_FFMPEG=ffmpeg, ou installe ffmpeg via Homebrew.",
        `Erreur initiale: ${error instanceof Error ? error.message : String(error)}`,
      ].join("\n")
    );
  });
};

const finalEncodingArgs =
  finalEncoder === "libx264"
    ? ["-c:v", "libx264", "-preset", x264Preset, "-b:v", finalBitrate]
    : [
        "-c:v",
        finalEncoder,
        "-b:v",
        finalBitrate,
        "-profile:v",
        "high",
        "-tag:v",
        "avc1",
      ];

const ensureFinalEncoderWorks = async () => {
  const args = [
    ...assemblyPrefix,
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=1920x1080:d=0.1:r=30",
    "-frames:v",
    "1",
    ...finalEncodingArgs,
    "-pix_fmt",
    "yuv420p",
    "-f",
    "null",
    "-",
  ];

  await run("Verification encodeur final", assemblyCommand, args, {
    stdio: "ignore",
  }).catch((error) => {
    throw new Error(
      [
        `L'encodeur final "${finalEncoder}" n'a pas pu demarrer.`,
        `Commande test: ${[assemblyCommand, ...args].map(quoteArg).join(" ")}`,
        'Utilise REMOTION_FULL_RALLY_FINAL_ENCODER=libx264 pour le chemin le plus compatible.',
        `Erreur initiale: ${error instanceof Error ? error.message : String(error)}`,
      ].join("\n")
    );
  });
};

const fileExists = async (path) =>
  stat(path)
    .then((info) => info.isFile())
    .catch(() => false);

const renderEnv = () => {
  const env = { ...process.env };
  delete env.REMOTION_MAPBOX_PROXY_URL;

  if (stagePreset === "h264") {
    env.REMOTION_EXPORT_PRESET = "h264";
  } else {
    delete env.REMOTION_EXPORT_PRESET;
  }

  return env;
};

const renderStage = async (composition, outputPath) => {
  if (shouldSkipRender) {
    if (!(await fileExists(outputPath))) {
      throw new Error(
        `REMOTION_FULL_RALLY_SKIP_RENDER=1 mais ${outputPath} est introuvable.`
      );
    }
    console.log(`\nRendu ignore pour ${composition}: ${outputPath}`);
    return;
  }

  const args = [
    "render",
    composition,
    outputPath,
    ...(hasTimeoutArg ? [] : [`--timeout=${DEFAULT_STAGE_TIMEOUT_MS}`]),
    ...extraRenderArgs,
  ];

  await run(`Rendu ${composition}`, remotionBin, args, { env: renderEnv() });
};

const probeDurationSeconds = async (path) => {
  const stdout = await capture("Analyse duree video", remotionBin, [
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ]);
  const parsed = JSON.parse(stdout);
  const duration = Number(parsed.format?.duration);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Duree video invalide pour ${path}: ${stdout}`);
  }

  return duration;
};

const formatSeconds = (seconds) => seconds.toFixed(6).replace(/0+$/, "0");

await mkdir(partsDir, { recursive: true });
await mkdir(dirname(output), { recursive: true });
await ensureAssemblerCanFade();
await ensureFinalEncoderWorks();

const stageOutputs = stages.map((composition) => ({
  composition,
  path: join(partsDir, `${composition}.${stageExtension}`),
}));

for (const stage of stageOutputs) {
  await renderStage(stage.composition, stage.path);
}

const durations = await Promise.all(
  stageOutputs.map((stage) => probeDurationSeconds(stage.path))
);

const inputs = stageOutputs.flatMap((stage) => ["-i", stage.path]);
const videoFilters = stageOutputs.map((stage, index) => {
  const filters = ["setpts=PTS-STARTPTS"];

  if (index > 0 && transitionHalfSeconds > 0) {
    filters.push(
      `fade=t=in:st=0:d=${formatSeconds(transitionHalfSeconds)}:color=black`
    );
  }

  if (index < stageOutputs.length - 1 && transitionHalfSeconds > 0) {
    const fadeStart = Math.max(0, durations[index] - transitionHalfSeconds);
    filters.push(
      `fade=t=out:st=${formatSeconds(fadeStart)}:d=${formatSeconds(
        transitionHalfSeconds
      )}:color=black`
    );
  }

  filters.push("format=yuv420p");
  return `[${index}:v]${filters.join(",")}[v${index}]`;
});

const concatInputs = stageOutputs.map((_, index) => `[v${index}]`).join("");
const filterComplex = [
  ...videoFilters,
  `${concatInputs}concat=n=${stageOutputs.length}:v=1:a=0[v]`,
].join(";");

await run("Assemblage FULL-ROUERGUE", assemblyCommand, [
  ...assemblyPrefix,
  "-y",
  ...inputs,
  "-filter_complex",
  filterComplex,
  "-map",
  "[v]",
  ...finalEncodingArgs,
  "-pix_fmt",
  "yuv420p",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-colorspace",
  "bt709",
  "-movflags",
  "+faststart",
  output,
]);

console.log(`\nExport termine: ${output}`);
