#!/usr/bin/env node

/**
 * @fileoverview HAJK release builder.
 *
 * Builds the backend, admin, and client apps and assembles them into two
 * release formats:
 *
 *   - simple:  client build only, for use with an external map service.
 *   - nodejs:  full-stack build with backend, admin, and client bundled.
 *
 * Run from the repository root:
 *   node scripts/create_release.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const BACKEND_DIR = path.join(ROOT_DIR, "apps", "backend");
const CLIENT_DIR = path.join(ROOT_DIR, "apps", "client");
const ADMIN_DIR = path.join(ROOT_DIR, "apps", "admin");
const CLIENT_PACKAGE_JSON_PATH = path.join(CLIENT_DIR, "package.json");
const DEFAULT_RELEASES_DIR = path.join(ROOT_DIR, "releases");

// ---------------------------------------------------------------------------
// Build configuration constants
// ---------------------------------------------------------------------------

/**
 * The mapserviceBase value injected into the nodejs release.
 * Change this if your backend runs on a different host or port.
 * Could also be supplied as a CLI argument or environment variable for
 * deployments that differ from the default.
 */
const NODE_MAPSERVICE_BASE = "http://localhost:3002/api/v2";

/**
 * The mapserviceBase value injected into the simple release.
 * An empty string means the client will resolve the map service relative
 * to its own origin, which is the correct behaviour for simple deployments.
 */
const SIMPLE_MAPSERVICE_BASE = "";

/** Default release candidate number when none is specified. */
const DEFAULT_RC_NUMBER = 1;

// ---------------------------------------------------------------------------
// Process execution
// ---------------------------------------------------------------------------

/**
 * Runs a shell command in a child process, inheriting stdio so that build
 * tool output is visible in the terminal.
 *
 * @param {string} command - The executable to run.
 * @param {string[]} args - Arguments to pass to the command.
 * @param {string} cwd - Working directory for the child process.
 * @returns {Promise<void>} Resolves when the process exits with code 0.
 * @throws {Error} If the process exits with a non-zero code or fails to start.
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      // On Windows, commands like "npm" are batch scripts and require shell
      // expansion to be found on PATH.
      shell: process.platform === "win32",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Command failed (exit ${code}): ${command} ${args.join(" ")} in ${cwd}`,
          ),
        );
      }
    });

    child.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Dependency management
// ---------------------------------------------------------------------------

/**
 * Reinstalls npm dependencies for all three apps.
 *
 * On Linux/macOS this delegates to the shared reinstall_modules.sh script.
 * On Windows that script is not available, so npm install is run per app.
 *
 * @returns {Promise<void>}
 */
async function refreshDependencies() {
  if (process.platform === "win32") {
    console.log(
      "\nWindows detected: reinstall_modules.sh is bash-only, " +
        "running npm install per app instead...",
    );
    await runCommand("npm", ["install"], BACKEND_DIR);
    await runCommand("npm", ["install"], ADMIN_DIR);
    await runCommand("npm", ["install"], CLIENT_DIR);
    return;
  }

  const reinstallScriptPath = path.join(ROOT_DIR, "scripts", "reinstall_modules.sh");
  console.log("\nRefreshing dependencies via scripts/reinstall_modules.sh...");
  await runCommand("bash", [reinstallScriptPath], ROOT_DIR);
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Asserts that a path exists and is a directory, throwing a descriptive error
 * if either condition is not met. Does not create anything.
 *
 * @param {string} dirPath - Absolute path to check.
 * @returns {Promise<void>}
 * @throws {Error} If the path does not exist or is not a directory.
 */
async function assertDirectoryExists(dirPath) {
  let dirStat;
  try {
    dirStat = await stat(dirPath);
  } catch {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  if (!dirStat.isDirectory()) {
    throw new Error(`Path exists but is not a directory: ${dirPath}`);
  }
}

/**
 * Creates a directory (and any missing parents) if it does not already exist,
 * then asserts that it is a directory.
 *
 * @param {string} dirPath - Absolute path to create.
 * @returns {Promise<void>}
 * @throws {Error} If the path exists but is not a directory.
 */
async function createDirectoryIfNeeded(dirPath) {
  await mkdir(dirPath, { recursive: true });
  await assertDirectoryExists(dirPath);
}

// ---------------------------------------------------------------------------
// Version handling
// ---------------------------------------------------------------------------

/**
 * Normalises a version string to the canonical "major.minor.patch" form.
 * Accepts either "major.minor" (patch defaults to 0) or "major.minor.patch".
 *
 * @param {string} inputVersion - Raw version string from user input or package.json.
 * @returns {string} Normalised version string, e.g. "4.3.0".
 * @throws {Error} If the string does not match the expected pattern.
 */
function normalizeVersion(inputVersion) {
  const trimmed = inputVersion.trim();
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid version "${inputVersion}". Expected "major.minor" or "major.minor.patch".`,
    );
  }

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  const patch = match[3] ? Number.parseInt(match[3], 10) : 0;
  return `${major}.${minor}.${patch}`;
}

/**
 * Reads the version field from the client app's package.json and returns it
 * in normalised form.
 *
 * @returns {Promise<string>} Normalised version string.
 * @throws {Error} If the version field is missing, empty, or malformed.
 */
async function getClientPackageVersion() {
  const packageRaw = await readFile(CLIENT_PACKAGE_JSON_PATH, "utf8");
  const packageJson = JSON.parse(packageRaw);

  if (typeof packageJson.version !== "string" || packageJson.version.trim() === "") {
    throw new Error(`Missing or invalid version in ${CLIENT_PACKAGE_JSON_PATH}.`);
  }

  return normalizeVersion(packageJson.version);
}

// ---------------------------------------------------------------------------
// Release naming
// ---------------------------------------------------------------------------

/**
 * Constructs the directory name for a release artifact.
 *
 * @param {string} version - Normalised version string, e.g. "4.3.0".
 * @param {boolean} isRc - Whether this is a release candidate.
 * @param {number} rcNumber - Release candidate number (ignored when isRc is false).
 * @param {"simple"|"nodejs"} type - Release type.
 * @returns {string} Directory name, e.g. "hajk-v4.3.0-rc.1-nodejs".
 */
function buildReleaseName(version, isRc, rcNumber, type) {
  const rcPart = isRc ? `-rc.${rcNumber}` : "";
  return `hajk-v${version}${rcPart}-${type}`;
}

// ---------------------------------------------------------------------------
// Archive creation
// ---------------------------------------------------------------------------

/**
 * Zips a directory, placing the resulting archive next to the source directory.
 * Any existing archive with the same name is replaced.
 *
 * On Linux/macOS this uses the system `zip` binary. On Windows it uses
 * PowerShell's Compress-Archive cmdlet. If the required tool is missing,
 * the underlying runCommand call will produce an error; ensure `zip` is on
 * PATH before calling this on Unix systems.
 *
 * @param {string} sourceDir - Path to the directory to compress.
 * @returns {Promise<string>} Path to the created archive file.
 */
async function zipDirectory(sourceDir) {
  const absoluteSourceDir = path.resolve(sourceDir);
  const parentDir = path.dirname(absoluteSourceDir);
  const archiveName = `${path.basename(absoluteSourceDir)}.zip`;
  const archivePath = path.join(parentDir, archiveName);

  await rm(archivePath, { force: true });

  if (process.platform === "win32") {
    await runCommand(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${absoluteSourceDir}' -DestinationPath '${archivePath}' -Force`,
      ],
      parentDir,
    );
  } else {
    await runCommand(
      "zip",
      ["-r", "-q", archiveName, path.basename(absoluteSourceDir)],
      parentDir,
    );
  }

  return archivePath;
}

// ---------------------------------------------------------------------------
// appConfig mutation
// ---------------------------------------------------------------------------

/**
 * Reads appConfig.json at the given path, sets the mapserviceBase field, and
 * writes the result back to disk with consistent formatting.
 *
 * The file must exist and contain valid JSON with a mapserviceBase key;
 * if either condition is not met a descriptive error is thrown rather than
 * silently producing a broken config.
 *
 * @param {string} configPath - Absolute path to appConfig.json.
 * @param {string} mapserviceBase - Value to assign to mapserviceBase.
 * @returns {Promise<void>}
 * @throws {Error} If the file cannot be read, is not valid JSON, or lacks the
 *   mapserviceBase key.
 */
async function updateMapserviceBase(configPath, mapserviceBase) {
  let rawConfig;
  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch (err) {
    throw new Error(`Could not read appConfig.json at ${configPath}: ${err.message}`);
  }

  let config;
  try {
    config = JSON.parse(rawConfig);
  } catch (err) {
    throw new Error(`appConfig.json at ${configPath} is not valid JSON: ${err.message}`);
  }

  if (!Object.prototype.hasOwnProperty.call(config, "mapserviceBase")) {
    throw new Error(
      `appConfig.json at ${configPath} does not contain a "mapserviceBase" key. ` +
        "The client build may be incomplete or the config schema has changed.",
    );
  }

  config.mapserviceBase = mapserviceBase;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Release assembly
// ---------------------------------------------------------------------------

/**
 * Assembles the simple release: client build only, with mapserviceBase set to
 * an empty string so the client resolves the map service relative to its origin.
 *
 * Any existing directory at simpleReleaseDir is removed before assembly.
 *
 * @param {string} simpleReleaseDir - Destination directory for the release.
 * @param {string} clientDistDir - Path to the compiled client build output.
 * @returns {Promise<void>}
 */
async function assembleSimpleRelease(simpleReleaseDir, clientDistDir) {
  await rm(simpleReleaseDir, { recursive: true, force: true });
  await mkdir(simpleReleaseDir, { recursive: true });
  await cp(clientDistDir, simpleReleaseDir, { recursive: true });

  const simpleConfig = path.join(simpleReleaseDir, "appConfig.json");
  await updateMapserviceBase(simpleConfig, SIMPLE_MAPSERVICE_BASE);

  // Include the configuration helper script
  await cp(
    path.join(ROOT_DIR, "scripts", "configure.mjs"),
    path.join(simpleReleaseDir, "configure.mjs"),
  );
}

/**
 * Assembles the nodejs release: backend runtime files, compiled backend code,
 * and client + admin builds placed under static/.
 *
 * mapserviceBase in the client config is set to NODE_MAPSERVICE_BASE so the
 * bundled client points to the co-located backend.
 *
 * Any existing directory at nodeReleaseDir is removed before assembly.
 *
 * @param {string} nodeReleaseDir - Destination directory for the release.
 * @param {string} backendDistDir - Path to the compiled backend output (dist/).
 * @param {string} adminBuildDir - Path to the compiled admin build output.
 * @param {string} clientDistDir - Path to the compiled client build output.
 * @returns {Promise<void>}
 */
async function assembleNodeRelease(nodeReleaseDir, backendDistDir, adminBuildDir, clientDistDir) {
  await rm(nodeReleaseDir, { recursive: true, force: true });
  await mkdir(nodeReleaseDir, { recursive: true });

  // Runtime configuration and data
  await cp(path.join(BACKEND_DIR, ".env.example"), path.join(nodeReleaseDir, ".env"));
  await cp(path.join(BACKEND_DIR, "App_Data"), path.join(nodeReleaseDir, "App_Data"), {
    recursive: true,
  });

  // Compiled backend
  await cp(path.join(backendDistDir, "apis"), path.join(nodeReleaseDir, "apis"), {
    recursive: true,
  });
  await cp(path.join(backendDistDir, "common"), path.join(nodeReleaseDir, "common"), {
    recursive: true,
  });
  await cp(path.join(backendDistDir, "index.js"), path.join(nodeReleaseDir, "index.js"));
  await cp(path.join(backendDistDir, "routes.js"), path.join(nodeReleaseDir, "routes.js"));

  // Package manifests (needed to run npm install in the release folder)
  await cp(path.join(BACKEND_DIR, "package.json"), path.join(nodeReleaseDir, "package.json"));
  await cp(
    path.join(BACKEND_DIR, "package-lock.json"),
    path.join(nodeReleaseDir, "package-lock.json"),
  );

  // Static assets: start with the backend's own static folder, then overlay
  // the compiled client and admin builds, replacing any placeholders.
  const staticDir = path.join(nodeReleaseDir, "static");
  await cp(path.join(BACKEND_DIR, "static"), staticDir, { recursive: true });

  const staticClientDir = path.join(staticDir, "client");
  const staticAdminDir = path.join(staticDir, "admin");

  await rm(staticClientDir, { recursive: true, force: true });
  await rm(staticAdminDir, { recursive: true, force: true });

  await cp(clientDistDir, staticClientDir, { recursive: true });
  await cp(adminBuildDir, staticAdminDir, { recursive: true });

  const nodeConfig = path.join(staticClientDir, "appConfig.json");
  await updateMapserviceBase(nodeConfig, NODE_MAPSERVICE_BASE);

  // Include the configuration helper script
  await cp(
    path.join(ROOT_DIR, "scripts", "configure.mjs"),
    path.join(nodeReleaseDir, "configure.mjs"),
  );
}

// ---------------------------------------------------------------------------
// Interactive prompt phase
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} BuildOptions
 * @property {string} targetParentDir - Directory under which release folders will be created.
 * @property {string} version - Normalised version string.
 * @property {boolean} isRc - Whether this is a release candidate.
 * @property {number} rcNumber - Release candidate number.
 * @property {boolean} shouldRefreshDependencies - Whether to reinstall npm dependencies.
 * @property {boolean} shouldZipReleases - Whether to create zip archives.
 */

/**
 * Interactively collects all build options from the user via stdin prompts.
 *
 * @param {import("node:readline/promises").Interface} rl - Active readline interface.
 * @returns {Promise<BuildOptions>}
 */
async function collectOptions(rl) {
  const targetParentDirInput = await rl.question(
    `Where should the release folders be created? (default: ${DEFAULT_RELEASES_DIR}): `,
  );
  const targetParentDir =
    targetParentDirInput.trim() === ""
      ? DEFAULT_RELEASES_DIR
      : path.resolve(targetParentDirInput.trim());
  await createDirectoryIfNeeded(targetParentDir);

  const defaultVersion = await getClientPackageVersion();
  const versionInput = await rl.question(
    `Release version override (default ${defaultVersion}, press Enter to keep): `,
  );
  const version =
    versionInput.trim() === "" ? defaultVersion : normalizeVersion(versionInput);

  const rcInput = await rl.question("Is this a release candidate? (y/N): ");
  const isRc = /^(y|yes)$/i.test(rcInput.trim());

  let rcNumber = DEFAULT_RC_NUMBER;
  if (isRc) {
    const rcNumberInput = await rl.question(
      `Release candidate number (default ${DEFAULT_RC_NUMBER}): `,
    );
    if (rcNumberInput.trim() !== "") {
      const parsedRc = Number.parseInt(rcNumberInput.trim(), 10);
      if (!Number.isInteger(parsedRc) || parsedRc <= 0) {
        throw new Error("RC number must be a positive integer.");
      }
      rcNumber = parsedRc;
    }
  }

  const refreshDepsInput = await rl.question(
    "Reinstall dependencies before build? (y/N): ",
  );
  const shouldRefreshDependencies = /^(y|yes)$/i.test(refreshDepsInput.trim());

  const zipReleasesInput = await rl.question(
    "Create .zip archives for release folders automatically? (y/N): ",
  );
  const shouldZipReleases = /^(y|yes)$/i.test(zipReleasesInput.trim());

  return {
    targetParentDir,
    version,
    isRc,
    rcNumber,
    shouldRefreshDependencies,
    shouldZipReleases,
  };
}

// ---------------------------------------------------------------------------
// Build and assembly phase
// ---------------------------------------------------------------------------

/**
 * Executes the full build and assembly pipeline for a given set of options.
 *
 * @param {BuildOptions} options - Options collected from the user.
 * @returns {Promise<void>}
 */
async function runBuild(options) {
  const { targetParentDir, version, isRc, rcNumber, shouldRefreshDependencies, shouldZipReleases } =
    options;

  const simpleReleaseName = buildReleaseName(version, isRc, rcNumber, "simple");
  const nodeReleaseName = buildReleaseName(version, isRc, rcNumber, "nodejs");
  const simpleReleaseDir = path.join(targetParentDir, simpleReleaseName);
  const nodeReleaseDir = path.join(targetParentDir, nodeReleaseName);

  // Print a summary before starting the (potentially long) build so the user
  // can catch mistakes without waiting for a full compile cycle.
  console.log("\n--- Build summary ---");
  console.log(`  Version:         ${version}${isRc ? ` (RC ${rcNumber})` : ""}`);
  console.log(`  Output dir:      ${targetParentDir}`);
  console.log(`  Simple release:  ${simpleReleaseName}`);
  console.log(`  Nodejs release:  ${nodeReleaseName}`);
  console.log(`  Refresh deps:    ${shouldRefreshDependencies ? "yes" : "no"}`);
  console.log(`  Create zips:     ${shouldZipReleases ? "yes" : "no"}`);
  console.log("---------------------\n");

  if (shouldRefreshDependencies) {
    await refreshDependencies();
  }

  console.log("\nBuilding backend...");
  await runCommand("npm", ["run", "compile"], BACKEND_DIR);

  console.log("\nBuilding admin...");
  await runCommand("npm", ["run", "build"], ADMIN_DIR);

  console.log("\nBuilding client...");
  await runCommand("npm", ["run", "build"], CLIENT_DIR);

  const backendDistDir = path.join(BACKEND_DIR, "dist");
  const adminBuildDir = path.join(ADMIN_DIR, "build");
  const clientDistDir = path.join(CLIENT_DIR, "build");

  console.log("\nAssembling simple release...");
  await assembleSimpleRelease(simpleReleaseDir, clientDistDir);

  console.log("Assembling nodejs release...");
  await assembleNodeRelease(nodeReleaseDir, backendDistDir, adminBuildDir, clientDistDir);

  console.log("\nRelease creation complete!");
  console.log(`  Simple release: ${simpleReleaseDir}`);
  console.log(`  Nodejs release: ${nodeReleaseDir}`);

  if (shouldZipReleases) {
    console.log("\nCreating zip archives...");
    const simpleArchivePath = await zipDirectory(simpleReleaseDir);
    const nodeArchivePath = await zipDirectory(nodeReleaseDir);
    console.log(`  Simple archive: ${simpleArchivePath}`);
    console.log(`  Nodejs archive: ${nodeArchivePath}`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Script entry point. Sets up the readline interface, delegates to
 * collectOptions and runBuild, then ensures cleanup happens regardless of
 * outcome.
 *
 * process.exitCode is used instead of process.exit() so that any pending
 * async cleanup (e.g. flushing stdio) can complete before the process
 * terminates. This is intentional.
 */
async function main() {
  const rl = createInterface({ input, output });

  try {
    await createDirectoryIfNeeded(DEFAULT_RELEASES_DIR);
    const options = await collectOptions(rl);
    await runBuild(options);
  } finally {
    // Always close the readline interface, even if an error was thrown, to
    // avoid leaving stdin open and hanging the process.
    rl.close();
  }
}

main().catch((error) => {
  console.error(`\nRelease creation failed: ${error.message}`);
  // Intentional: exitCode allows async cleanup to finish before exit.
  process.exitCode = 1;
});
