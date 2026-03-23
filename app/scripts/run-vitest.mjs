import "../../infrastructure/scripts/node-preload/disable-vite-net-use.cjs";

import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

if (process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1") {
  const esbuildFallbackUrl = pathToFileURL(
    path.resolve(currentDir, "../../infrastructure/scripts/node-preload/esbuild-runner-fallback.mjs"),
  ).href;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "esbuild") {
        return {
          shortCircuit: true,
          url: esbuildFallbackUrl,
        };
      }

      return nextResolve(specifier, context);
    },
  });
}

const vitestEntrypoints = [
  path.resolve(currentDir, "../node_modules/vitest/vitest.mjs"),
  path.resolve(currentDir, "../../node_modules/vitest/vitest.mjs"),
];

const vitestEntrypoint = vitestEntrypoints.find((candidate) => fs.existsSync(candidate));

if (!vitestEntrypoint) {
  throw new Error("Unable to locate Vitest entrypoint in app or root node_modules.");
}

await import(pathToFileURL(vitestEntrypoint).href);
