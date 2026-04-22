import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const rootManifestPath = path.join(repoRoot, "package.json");
const rootLockfilePath = path.join(repoRoot, "package-lock.json");

const fail = (message) => {
  console.error(`[validate-workspace-toolchain] ${message}`);
  process.exit(1);
};

const workspaceDefinitions = [
  {
    name: "root",
    manifestPath: rootManifestPath,
    packages: ["concurrently"],
  },
  {
    name: "app",
    manifestPath: path.join(repoRoot, "app", "package.json"),
    packages: ["typescript", "vite", "vitest", "eslint", "@eslint/js", "leaflet", "lucide-react"],
  },
  {
    name: "mobile",
    manifestPath: path.join(repoRoot, "mobile", "package.json"),
    packages: ["typescript", "vitest", "eslint", "expo"],
  },
  {
    name: "api",
    manifestPath: path.join(repoRoot, "api", "package.json"),
    packages: ["typescript", "vitest", "eslint", "@eslint/js", "cross-env", "express"],
  },
  {
    name: "database",
    manifestPath: path.join(repoRoot, "database", "package.json"),
    packages: ["typescript", "drizzle-kit", "@types/node"],
  },
];

const supportedWorkspaceNames = new Set(workspaceDefinitions.map((workspace) => workspace.name));

const unsupportedWorkspaceLockfiles = [
  path.join(repoRoot, "app", "package-lock.json"),
  path.join(repoRoot, "mobile", "package-lock.json"),
  path.join(repoRoot, "api", "package-lock.json"),
  path.join(repoRoot, "database", "package-lock.json"),
  path.join(repoRoot, "infrastructure", "package-lock.json"),
];

const resolvePackage = (requireFromManifest, packageName) => {
  const candidateSpecifiers = [`${packageName}/package.json`, packageName];

  for (const specifier of candidateSpecifiers) {
    try {
      return requireFromManifest.resolve(specifier);
    } catch {
      // Keep trying the next resolution target.
    }
  }

  return null;
};

const parseRequestedWorkspaces = () => {
  const requestedWorkspaceNames = [];
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--workspace") {
      const workspaceName = args[index + 1];

      if (!workspaceName) {
        fail("Missing workspace name after --workspace.");
      }

      requestedWorkspaceNames.push(workspaceName);
      index += 1;
      continue;
    }

    if (argument.startsWith("--workspace=")) {
      const workspaceName = argument.slice("--workspace=".length).trim();

      if (!workspaceName) {
        fail("Missing workspace name after --workspace=.");
      }

      requestedWorkspaceNames.push(workspaceName);
      continue;
    }

    fail(`Unsupported argument '${argument}'. Use repeated --workspace <name> selectors only.`);
  }

  if (requestedWorkspaceNames.length === 0) {
    return workspaceDefinitions;
  }

  const invalidWorkspaceNames = requestedWorkspaceNames.filter(
    (workspaceName) => !supportedWorkspaceNames.has(workspaceName),
  );

  if (invalidWorkspaceNames.length > 0) {
    fail(
      `Unsupported workspace selectors: ${invalidWorkspaceNames.join(
        ", ",
      )}. Supported values: ${workspaceDefinitions.map((workspace) => workspace.name).join(", ")}.`,
    );
  }

  const selectedWorkspaceNames = new Set(["root", ...requestedWorkspaceNames]);
  return workspaceDefinitions.filter((workspace) => selectedWorkspaceNames.has(workspace.name));
};

const main = () => {
  if (!fs.existsSync(rootLockfilePath)) {
    fail("Missing root package-lock.json. Root workspace installs require the committed lockfile.");
  }

  const strayLockfiles = unsupportedWorkspaceLockfiles.filter((lockfilePath) => fs.existsSync(lockfilePath));
  if (strayLockfiles.length > 0) {
    const relativePaths = strayLockfiles
      .map((lockfilePath) => path.relative(repoRoot, lockfilePath))
      .join(", ");

    fail(`Unsupported workspace package-lock.json files found: ${relativePaths}. Use a single root install only.`);
  }

  const missingPackages = [];

  const selectedWorkspaces = parseRequestedWorkspaces();

  for (const workspace of selectedWorkspaces) {
    const requireFromManifest = createRequire(workspace.manifestPath);

    for (const packageName of workspace.packages) {
      const resolvedPath = resolvePackage(requireFromManifest, packageName);
      if (!resolvedPath) {
        missingPackages.push(`${workspace.name}:${packageName}`);
      }
    }
  }

  if (missingPackages.length > 0) {
    fail(
      `Missing required workspace packages: ${missingPackages.join(
        ", ",
      )}. Reinstall from the repo root with \`npm ci --include=dev\`.`,
    );
  }

  console.log(
    `[validate-workspace-toolchain] Root lockfile and required toolchain packages are present for workspaces: ${selectedWorkspaces
      .map((workspace) => workspace.name)
      .join(", ")}. Use repo-root installs only.`,
  );
};

main();
