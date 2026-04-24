import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

import { resolveLocalBin, resolveRepoPath } from "../performance/lib/resolve-local-bin.mjs";

const qualityOutputRoot = (() => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : resolveRepoPath(configuredRoot);
  }

  return resolveRepoPath(process.env.CI ? "tmp/ci/quality" : "tmp/quality");
})();
const shouldSkip =
  process.env.ECOTRACK_SKIP_LIGHTHOUSE_GATE === "1" || process.env.ENABLE_LIGHTHOUSE_GATE === "0";
const previewPort = process.env.LIGHTHOUSE_PREVIEW_PORT || "4173";
const previewBaseUrl = process.env.LIGHTHOUSE_BASE_URL || `http://127.0.0.1:${previewPort}`;
const mockApiPort = 3001;
const mockApiBaseUrl = `http://127.0.0.1:${mockApiPort}`;
const mockSupabaseUrl = process.env.LIGHTHOUSE_SUPABASE_URL?.trim() || "https://ecotrack.test.supabase.co";
const mockSupabasePublishableKey =
  process.env.LIGHTHOUSE_SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_test_key";

if (shouldSkip) {
  console.log("[ci] Lighthouse gate skipped because ECOTRACK_SKIP_LIGHTHOUSE_GATE=1 or ENABLE_LIGHTHOUSE_GATE=0.");
  process.exit(0);
}

const writeJsonResponse = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
};

const startLighthouseMockApi = () =>
  new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", mockApiBaseUrl);
      const { method = "GET" } = request;

      if (method === "OPTIONS") {
        response.statusCode = 204;
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.end();
        return;
      }

      if (method === "GET" && requestUrl.pathname === "/health") {
        writeJsonResponse(response, 200, { status: "ok" });
        return;
      }

      if (method === "GET" && requestUrl.pathname === "/api/auth/status") {
        writeJsonResponse(response, 200, { authenticated: false, user: null });
        return;
      }

      if (
        method === "POST" &&
        (requestUrl.pathname === "/api/metrics/frontend" || requestUrl.pathname === "/api/errors")
      ) {
        response.statusCode = 204;
        response.setHeader("Cache-Control", "no-store");
        response.end();
        return;
      }

      if (requestUrl.pathname.startsWith("/api/")) {
        writeJsonResponse(response, 404, {
          error: "Lighthouse mock API does not implement this route.",
          path: requestUrl.pathname,
        });
        return;
      }

      writeJsonResponse(response, 404, { error: "Not found" });
    });

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        console.log(`[ci] Lighthouse mock API skipped because port ${mockApiPort} is already in use.`);
        resolve(null);
        return;
      }

      reject(error);
    });

    server.listen(mockApiPort, () => {
      console.log(`[ci] Lighthouse mock API ready at ${mockApiBaseUrl}`);
      resolve(server);
    });
  });

const env = {
  ...process.env,
  ECOTRACK_QUALITY_OUTPUT_ROOT: qualityOutputRoot,
  VITE_API_BASE_URL: mockApiBaseUrl,
  VITE_API_TELEMETRY_ENABLED: process.env.VITE_API_TELEMETRY_ENABLED ?? "false",
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL?.trim() || mockSupabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || mockSupabasePublishableKey,
};

await mkdir(qualityOutputRoot, { recursive: true });
await mkdir(path.join(qualityOutputRoot, "lighthouse"), { recursive: true });

const runCommand = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });

const buildExitCode = await runCommand("npm", ["run", "build", "--workspace=ecotrack-app"]);
if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

const mockApi = await startLighthouseMockApi();

const preview = spawn(
  "npm",
  ["run", "preview", "--workspace=ecotrack-app", "--", "--host", "127.0.0.1", "--port", previewPort],
  {
    env,
    shell: true,
    stdio: "inherit",
  },
);

const cleanup = () => {
  if (!preview.killed) {
    preview.kill("SIGTERM");
  }

  if (mockApi?.listening) {
    mockApi.close();
  }
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

const waitResult = spawn(
  "node",
  ["infrastructure/scripts/wait-for-api-ready.mjs", "--url", previewBaseUrl],
  {
    env,
    shell: true,
    stdio: "inherit",
  },
);

const waitExitCode = await new Promise((resolve) => {
  waitResult.on("close", resolve);
});

if (waitExitCode !== 0) {
  cleanup();
  process.exit(waitExitCode ?? 1);
}

const lhci = spawn(resolveLocalBin("lhci"), ["autorun", "--config=app/lighthouserc.cjs"], {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

const lhciExitCode = await new Promise((resolve) => {
  lhci.on("close", resolve);
});

cleanup();
process.exit(lhciExitCode ?? 1);
