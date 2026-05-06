import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(currentDir, "..");
const apiEntryPoint = path.join(apiRoot, "dist/main.js");
const apiListeningPattern = /API listening on /;
const apiReadyPath = "/api/health/ready";
const watchSuccessPattern = /Found (\d+) errors?\. Watching for file changes\.$/;
const watchRebuildPattern = /File change detected\. Starting incremental compilation\.\.\.$/;
const tscEntrypoints = [
  path.resolve(apiRoot, "node_modules/typescript/bin/tsc"),
  path.resolve(apiRoot, "../node_modules/typescript/bin/tsc"),
];
const tscEntrypoint = tscEntrypoints.find((candidate) => fs.existsSync(candidate));

if (!tscEntrypoint) {
  console.error("[api-dev] Unable to locate the TypeScript CLI entrypoint.");
  process.exit(1);
}

let apiProcess = null;
let typesProcess = null;
let isShuttingDown = false;
let restartRequested = false;
let sawWatchRebuild = false;
let resolveApiReady = null;
let apiReadyPromise = null;

const createApiReadyPromise = () =>
  new Promise((resolve) => {
    resolveApiReady = () => {
      resolveApiReady = null;
      resolve();
    };
  });

const logWithPrefix = (prefix, line, method = "log") => {
  if (line.trim().length === 0) {
    return;
  }

  console[method](`[${prefix}] ${line}`);
};

const resolveApiPort = () => {
  const parsed = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3001;
};

const resolveApiHost = () => {
  const configuredHost = process.env.API_HOST?.trim();
  return configuredHost && configuredHost !== "0.0.0.0" ? configuredHost : "127.0.0.1";
};

const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const waitForApiReadiness = async () => {
  const readyUrl = `http://${resolveApiHost()}:${resolveApiPort()}${apiReadyPath}`;
  const startedAt = Date.now();

  while (!isShuttingDown && apiProcess && Date.now() - startedAt < 120_000) {
    try {
      const response = await fetch(readyUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        console.log(`[api-dev] API readiness confirmed at ${readyUrl}.`);
        resolveApiReady?.();
        return;
      }
    } catch {
      // The runtime may still be initializing Nest modules or database providers.
    }

    await wait(1500);
  }

  if (!isShuttingDown && apiProcess) {
    console.warn(`[api-dev] API readiness has not passed yet at ${readyUrl}; keeping the runtime alive.`);
    resolveApiReady?.();
  }
};

const attachLineReaders = (child, prefix, onStdoutLine) => {
  if (child.stdout) {
    const stdoutReader = readline.createInterface({ input: child.stdout });
    stdoutReader.on("line", (line) => {
      logWithPrefix(prefix, line);
      onStdoutLine?.(line);
    });
  }

  if (child.stderr) {
    const stderrReader = readline.createInterface({ input: child.stderr });
    stderrReader.on("line", (line) => {
      logWithPrefix(prefix, line, "error");
    });
  }
};

const startApiProcess = (reason) => {
  if (isShuttingDown || apiProcess) {
    return;
  }

  console.log(`[api-dev] Starting API runtime (${reason}).`);
  apiReadyPromise = createApiReadyPromise();
  const child = spawn(process.execPath, ["dist/main.js"], {
    cwd: apiRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
    },
    stdio: ["inherit", "pipe", "pipe"],
  });

  apiProcess = child;
  attachLineReaders(child, "api", (line) => {
    if (apiListeningPattern.test(line)) {
      void waitForApiReadiness();
    }
  });

  child.on("exit", (code, signal) => {
    const wasRestart = restartRequested;
    apiProcess = null;
    resolveApiReady?.();

    if (isShuttingDown) {
      return;
    }

    if (wasRestart) {
      restartRequested = false;
      startApiProcess("successful TypeScript rebuild");
      return;
    }

    const exitReason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[api-dev] API runtime exited with ${exitReason}.`);
  });
};

const restartApiProcess = () => {
  if (isShuttingDown || restartRequested) {
    return;
  }

  if (!apiProcess) {
    startApiProcess("successful TypeScript rebuild");
    return;
  }

  restartRequested = true;
  console.log("[api-dev] Restarting API runtime after a successful TypeScript rebuild.");
  apiProcess.kill("SIGINT");
};

const runTypeScriptBuild = () =>
  new Promise((resolve) => {
    console.log("[api-dev] Running an API build before enabling watch mode.");
    const child = spawn(process.execPath, [tscEntrypoint, "-p", "tsconfig.build.json"], {
      cwd: apiRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    attachLineReaders(child, "build");

    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`[api-dev] Initial TypeScript build exited with signal ${signal}.`);
        resolve(false);
        return;
      }

      if ((code ?? 1) === 0) {
        resolve(true);
        return;
      }

      console.error(`[api-dev] Initial TypeScript build exited with code ${code ?? 1}.`);
      resolve(false);
    });
  });

const handleTypeScriptWatchLine = (line) => {
  const watchSuccessMatch = line.match(watchSuccessPattern);
  if (watchRebuildPattern.test(line)) {
    sawWatchRebuild = true;
    return;
  }

  if (!watchSuccessMatch) {
    return;
  }

  const errorCount = Number.parseInt(watchSuccessMatch[1] ?? "0", 10);
  if (!Number.isInteger(errorCount)) {
    return;
  }

  if (errorCount > 0) {
    sawWatchRebuild = false;
    console.error(`[api-dev] TypeScript watch reported ${errorCount} errors. Keeping the current runtime.`);
    return;
  }

  if (!sawWatchRebuild) {
    console.log("[api-dev] TypeScript watch is ready.");
    return;
  }

  sawWatchRebuild = false;
  restartApiProcess();
};

const startTypeScriptWatch = () => {
  if (isShuttingDown || typesProcess) {
    return;
  }

  const child = spawn(
    process.execPath,
    [
      tscEntrypoint,
      "-p",
      "tsconfig.build.json",
      "-w",
      "--preserveWatchOutput",
      "--noEmitOnError",
    ],
    {
      cwd: apiRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  typesProcess = child;
  attachLineReaders(child, "types", handleTypeScriptWatchLine);

  child.on("exit", (code, signal) => {
    typesProcess = null;

    if (isShuttingDown) {
      return;
    }

    const exitReason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[api-dev] TypeScript watch exited with ${exitReason}. Stopping the dev supervisor.`);
    void shutdown(code ?? 1);
  });
};

const shutdown = async (exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (apiProcess) {
    apiProcess.kill("SIGINT");
  }

  if (typesProcess) {
    typesProcess.kill("SIGINT");
  }

  process.exitCode = exitCode;
};

process.once("SIGINT", () => {
  void shutdown(0);
});

process.once("SIGTERM", () => {
  void shutdown(0);
});

const hasExistingBuild = fs.existsSync(apiEntryPoint);

if (!hasExistingBuild) {
  console.log("[api-dev] No existing dist build was found. The initial TypeScript build will create it.");
}

const initialBuildSucceeded = await runTypeScriptBuild();

if (!initialBuildSucceeded && !hasExistingBuild) {
  console.error("[api-dev] Cannot start the API because the initial TypeScript build did not succeed.");
  process.exitCode = 1;
  process.exit();
}

if (!initialBuildSucceeded) {
  console.error(
    "[api-dev] Fresh dist build failed. Starting the existing runtime and TypeScript watch for recovery.",
  );
}

startApiProcess(initialBuildSucceeded ? "fresh dist after the initial TypeScript build" : "existing dist fallback");
await apiReadyPromise;

startTypeScriptWatch();
