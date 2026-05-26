import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { get as httpsGet } from "node:https";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const [, , composition = "FULL-ROUERGUE", output = "out/FULL-ROUERGUE.mp4", ...extraArgs] =
  process.argv;

const cacheDir = process.env.REMOTION_MAPBOX_CACHE_DIR ?? "out/mapbox-cache";
const maxConcurrent = Number(process.env.REMOTION_MAPBOX_PROXY_CONCURRENCY ?? 4);
const minDelayMs = Number(process.env.REMOTION_MAPBOX_PROXY_DELAY_MS ?? 80);
const maxRetries = Number(process.env.REMOTION_MAPBOX_PROXY_RETRIES ?? 8);
const requestTimeoutMs = Number(
  process.env.REMOTION_MAPBOX_PROXY_REQUEST_TIMEOUT_MS ?? 120000
);

const allowedHosts = new Set(["api.mapbox.com"]);
const pending = new Map();
const queue = [];
let active = 0;
let lastStartedAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cachePaths = (url) => {
  const hash = createHash("sha256").update(url).digest("hex");
  return {
    body: join(cacheDir, `${hash}.body`),
    meta: join(cacheDir, `${hash}.json`),
    tempBody: join(cacheDir, `${hash}.${process.pid}.body.tmp`),
    tempMeta: join(cacheDir, `${hash}.${process.pid}.json.tmp`),
  };
};

const readCached = async (url) => {
  const paths = cachePaths(url);
  try {
    const [body, meta] = await Promise.all([
      readFile(paths.body),
      readFile(paths.meta, "utf8"),
    ]);
    return { body, ...JSON.parse(meta), cache: "hit" };
  } catch {
    return null;
  }
};

const writeCached = async (url, response) => {
  if (response.statusCode !== 200) return;

  const paths = cachePaths(url);
  await mkdir(dirname(paths.body), { recursive: true });
  await Promise.all([
    writeFile(paths.tempBody, response.body),
    writeFile(
      paths.tempMeta,
      JSON.stringify({
        statusCode: response.statusCode,
        headers: response.headers,
      })
    ),
  ]);
  await Promise.all([
    rename(paths.tempBody, paths.body),
    rename(paths.tempMeta, paths.meta),
  ]);
};

const cleanHeaders = (headers) => {
  const cleaned = { ...headers };
  delete cleaned["connection"];
  delete cleaned["content-length"];
  delete cleaned["keep-alive"];
  delete cleaned["transfer-encoding"];
  cleaned["access-control-allow-origin"] = "*";
  cleaned["x-remotion-mapbox-cache"] = headers["x-remotion-mapbox-cache"] ?? "miss";
  return cleaned;
};

const requestMapbox = (url) =>
  new Promise((resolve, reject) => {
    const request = httpsGet(
      url,
      {
        headers: {
          "user-agent": "rouergue-2026-remotion-mapbox-cache",
        },
        timeout: requestTimeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 500,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timeout Mapbox après ${requestTimeoutMs}ms`));
    });
    request.on("error", reject);
  });

const retryDelayMs = (response, attempt) => {
  const retryAfter = Number(response.headers["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }

  return Math.min(60000, 1500 * 2 ** attempt);
};

const fetchWithRetry = async (url) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await requestMapbox(url);
    if (![429, 500, 502, 503, 504].includes(response.statusCode)) {
      return response;
    }

    if (attempt === maxRetries) {
      return response;
    }

    await sleep(retryDelayMs(response, attempt));
  }

  throw new Error(`Échec Mapbox inattendu pour ${url}`);
};

const pump = () => {
  if (active >= maxConcurrent || queue.length === 0) return;

  const waitMs = Math.max(0, minDelayMs - (Date.now() - lastStartedAt));
  setTimeout(() => {
    if (active >= maxConcurrent || queue.length === 0) return;

    const next = queue.shift();
    active += 1;
    lastStartedAt = Date.now();

    next
      .run()
      .then(next.resolve, next.reject)
      .finally(() => {
        active -= 1;
        pump();
      });

    pump();
  }, waitMs);
};

const enqueue = (run) =>
  new Promise((resolve, reject) => {
    queue.push({ run, resolve, reject });
    pump();
  });

const getMapboxResource = async (url) => {
  const cached = await readCached(url);
  if (cached) {
    return {
      ...cached,
      headers: {
        ...cached.headers,
        "x-remotion-mapbox-cache": "hit",
      },
    };
  }

  if (!pending.has(url)) {
    pending.set(
      url,
      enqueue(async () => {
        const response = await fetchWithRetry(url);
        await writeCached(url, response);
        return {
          ...response,
          headers: {
            ...response.headers,
            "x-remotion-mapbox-cache": "miss",
          },
        };
      }).finally(() => pending.delete(url))
    );
  }

  return pending.get(url);
};

const send = (response, statusCode, headers, body) => {
  response.writeHead(statusCode, cleanHeaders(headers));
  response.end(body);
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, {}, "");
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const target = requestUrl.searchParams.get("url");
    if (!target) {
      send(response, 400, { "content-type": "text/plain" }, "Missing url");
      return;
    }

    const targetUrl = new URL(target);
    if (targetUrl.protocol !== "https:" || !allowedHosts.has(targetUrl.host)) {
      send(response, 403, { "content-type": "text/plain" }, "Forbidden host");
      return;
    }

    const result = await getMapboxResource(targetUrl.toString());
    send(response, result.statusCode, result.headers, result.body);
  } catch (err) {
    send(
      response,
      500,
      { "content-type": "text/plain" },
      err instanceof Error ? err.message : String(err)
    );
  }
});

await mkdir(cacheDir, { recursive: true });

const cacheStats = await stat(cacheDir).catch(() => null);
if (!cacheStats?.isDirectory()) {
  throw new Error(`${cacheDir} existe mais n'est pas un dossier`);
}

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const proxyUrl = `http://127.0.0.1:${address.port}/mapbox`;

const hasTimeoutArg = extraArgs.some(
  (arg) => arg === "--timeout" || arg.startsWith("--timeout=")
);
const renderArgs = [
  "render",
  composition,
  output,
  ...(hasTimeoutArg ? [] : ["--timeout=120000"]),
  ...extraArgs,
];

const env = {
  ...process.env,
  REMOTION_EXPORT_PRESET: process.env.REMOTION_EXPORT_PRESET ?? "h264",
  REMOTION_MAPBOX_PROXY_URL: proxyUrl,
};

console.log(`Proxy Mapbox local: ${proxyUrl}`);
console.log(`Cache Mapbox: ${cacheDir}`);
console.log(`Rendu Remotion: remotion ${renderArgs.join(" ")}`);

const remotionBin = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion"
);

const child = spawn(remotionBin, renderArgs, {
  env,
  stdio: "inherit",
});

const shutdown = async (signal) => {
  child.kill(signal);
  await new Promise((resolve) => server.close(resolve));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const exitCode = await new Promise((resolve) => {
  child.on("exit", (code, signal) => {
    if (signal) {
      resolve(1);
      return;
    }
    resolve(code ?? 1);
  });
});

await new Promise((resolve) => server.close(resolve));
process.exit(exitCode);
