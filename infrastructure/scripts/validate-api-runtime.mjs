import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const apiDir = path.join(repoRoot, 'api');
const apiPackageJsonPath = path.join(apiDir, 'package.json');
const apiDistMainPath = path.join(apiDir, 'dist', 'main.js');

const fail = (message) => {
  console.error(`[validate-api-runtime] ${message}`);
  process.exitCode = 1;
};

const main = async () => {
  await access(apiDistMainPath).catch(() => {
    throw new Error(`API build output is missing at ${apiDistMainPath}. Run the API build before validating runtime dependencies.`);
  });

  const packageJson = JSON.parse(await readFile(apiPackageJsonPath, 'utf8'));
  const runtimeDependencies = Object.keys(packageJson.dependencies ?? {}).sort();
  const requireFromApiDist = createRequire(apiDistMainPath);
  const missingDependencies = [];

  for (const dependencyName of runtimeDependencies) {
    try {
      requireFromApiDist.resolve(`${dependencyName}/package.json`);
    } catch (packageJsonError) {
      try {
        requireFromApiDist.resolve(dependencyName);
      } catch (moduleError) {
        missingDependencies.push({
          dependencyName,
          message: moduleError instanceof Error ? moduleError.message : String(moduleError),
          packageJsonMessage:
            packageJsonError instanceof Error ? packageJsonError.message : String(packageJsonError),
        });
      }
    }
  }

  if (missingDependencies.length > 0) {
    const dependencyList = missingDependencies
      .map(
        ({ dependencyName, message, packageJsonMessage }) =>
          `- ${dependencyName}\n  package.json resolution: ${packageJsonMessage}\n  module resolution: ${message}`,
      )
      .join('\n');

    throw new Error(`Missing API runtime dependencies when resolving from api/dist/main.js:\n${dependencyList}`);
  }

  console.log(
    `[validate-api-runtime] Resolved ${runtimeDependencies.length} API production dependencies from ${path.relative(
      repoRoot,
      apiDistMainPath,
    )}.`,
  );
};

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
