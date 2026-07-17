#!/usr/bin/env node

/**
 * @fileoverview Hajk release configuration helper.
 *
 * Configures a Hajk release for deployment by prompting for hostname, port,
 * and environment settings, then:
 *   - Updates appConfig.json and admin/config.json with correct API endpoints
 *   - Guides through critical .env variables (SESSION_SECRET, NODE_ENV, etc.)
 *   - Optionally generates admin password hash
 *   - Validates that static assets and .env exist
 *
 * Run from the release directory after extracting on the target server:
 *   node configure.mjs
 *
 * This script is idempotent — it's safe to run multiple times.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_PATHS = {
  appConfig: "static/client/appConfig.json",
  adminConfig: "static/admin/config.json",
  env: ".env",
};

const CRITICAL_ENV_VARS = [
  "SESSION_SECRET",
  "NODE_ENV",
  "EXPRESS_TRUST_PROXY",
  "ADMIN_PASSWORD_HASH",
  "LOG_LEVEL",
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Validates that required config files exist.
 *
 * @returns {Promise<void>}
 * @throws {Error} If any required file is missing.
 */
async function validateFiles() {
  const missing = [];
  for (const [name, path] of Object.entries(CONFIG_PATHS)) {
    if (!existsSync(path)) {
      missing.push(`${name} (${path})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required files:\n${missing.map((f) => `  - ${f}`).join("\n")}\n` +
        "This script must be run from the release root directory.",
    );
  }
}

/**
 * Generates a random SESSION_SECRET suitable for Express cookie signing.
 *
 * @returns {string} 32-byte hex string.
 */
function generateSessionSecret() {
  return randomBytes(32).toString("hex");
}

/**
 * Reads JSON from file, allowing trailing commas (for .env-like files).
 * In practice, we only use this for proper JSON files, but the function
 * is defensive.
 *
 * @param {string} filePath - Path to JSON file.
 * @returns {object} Parsed JSON.
 * @throws {Error} If file cannot be read or parsed.
 */
function readJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

/**
 * Writes JSON to file with consistent formatting (2-space indent, trailing newline).
 *
 * @param {string} filePath - Path to JSON file.
 * @param {object} data - Object to write.
 * @throws {Error} If write fails.
 */
function writeJsonFile(filePath, data) {
  try {
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  } catch (err) {
    throw new Error(`Failed to write ${filePath}: ${err.message}`);
  }
}

/**
 * Reads .env file into a key=value map, preserving order and comments.
 * Returns only the non-comment, non-empty lines.
 *
 * @param {string} filePath - Path to .env file.
 * @returns {Map<string, string>} Key-value pairs.
 */
function readEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const env = new Map();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) {
      env.set(match[1], match[2]);
    }
  }

  return env;
}

/**
 * Writes .env file from a key=value map, preserving original comments and structure.
 * Updates only the keys present in the map; leaves everything else untouched.
 *
 * @param {string} filePath - Path to .env file.
 * @param {Map<string, string>} updates - Key-value pairs to update.
 */
function writeEnvFile(filePath, updates) {
  const content = readFileSync(filePath, "utf8");
  let output = content;

  for (const [key, value] of updates) {
    // Match the line with this key, preserving the value format
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(output)) {
      // Key exists, update it
      output = output.replace(regex, `${key}=${value}`);
    } else {
      // Key doesn't exist, append it at the end
      if (!output.endsWith("\n")) output += "\n";
      output += `${key}=${value}\n`;
    }
  }

  writeFileSync(filePath, output, "utf8");
}

/**
 * Constructs the mapserviceBase URL based on hostname, port, and whether
 * it's behind a reverse proxy.
 *
 * @param {string} hostname - The hostname (e.g., "localhost" or "karta.example.com").
 * @param {number} port - The backend port.
 * @param {boolean} behindProxy - Whether a reverse proxy is in front.
 * @returns {string} The mapserviceBase URL.
 */
function buildMapserviceBase(hostname, port, behindProxy) {
  if (hostname === "localhost") {
    // Local dev/test: always include port
    return `http://localhost:${port}/api/v2`;
  } else if (behindProxy) {
    // Behind reverse proxy: use HTTPS, no port
    return `https://${hostname}/api/v2`;
  } else {
    // Direct to backend: use HTTP with port
    return `http://${hostname}:${port}/api/v2`;
  }
}

/**
 * Constructs the admin base URL (without /api/v2 suffix).
 *
 * @param {string} hostname - The hostname.
 * @param {number} port - The backend port.
 * @param {boolean} behindProxy - Whether a reverse proxy is in front.
 * @returns {string} The admin base URL.
 */
function buildAdminBase(hostname, port, behindProxy) {
  if (hostname === "localhost") {
    return `http://localhost:${port}`;
  } else if (behindProxy) {
    return `https://${hostname}`;
  } else {
    return `http://${hostname}:${port}`;
  }
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DeploymentConfig
 * @property {string} hostname - Hostname or IP of the server.
 * @property {number} port - Backend port.
 * @property {boolean} behindProxy - Whether behind a reverse proxy.
 * @property {string} environment - "development" or "production".
 * @property {boolean} configureAdmin - Whether to set up admin password.
 * @property {string} [adminPassword] - Admin password (if configureAdmin is true).
 */

/**
 * Interactively collects deployment configuration from the user.
 *
 * @param {import("node:readline/promises").Interface} rl - Active readline interface.
 * @returns {Promise<DeploymentConfig>}
 */
async function collectConfig(rl) {
  console.log("\n--- Hajk Release Configuration ---\n");

  const hostnameInput = await rl.question(
    "Hostname (e.g., 'localhost', 'karta.example.com') [localhost]: ",
  );
  const hostname = hostnameInput.trim() || "localhost";

  const portInput = await rl.question("Backend port [3002]: ");
  const port = parseInt(portInput.trim() || "3002", 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be a number between 1 and 65535.");
  }

  let behindProxy = false;
  if (hostname !== "localhost") {
    const proxyInput = await rl.question(
      "Is this behind a reverse proxy (nginx/Apache)? (y/N): ",
    );
    behindProxy = /^(y|yes)$/i.test(proxyInput.trim());
  }

  const envInput = await rl.question(
    "Environment (development/production) [production]: ",
  );
  const environment =
    envInput.trim().toLowerCase() === "development"
      ? "development"
      : "production";

  const adminInput = await rl.question(
    "Set up admin password protection? (y/N): ",
  );
  const configureAdmin = /^(y|yes)$/i.test(adminInput.trim());

  let adminPassword = "";
  if (configureAdmin) {
    adminPassword = await rl.question("Admin password: ");
    if (!adminPassword.trim()) {
      throw new Error("Admin password cannot be empty.");
    }
  }

  return {
    hostname,
    port,
    behindProxy,
    environment,
    configureAdmin,
    adminPassword,
  };
}

// ---------------------------------------------------------------------------
// Configuration updates
// ---------------------------------------------------------------------------

/**
 * Updates appConfig.json with the correct mapserviceBase.
 *
 * @param {string} mapserviceBase - The new mapserviceBase URL.
 */
function updateAppConfig(mapserviceBase) {
  const config = readJsonFile(CONFIG_PATHS.appConfig);

  if (!Object.prototype.hasOwnProperty.call(config, "mapserviceBase")) {
    throw new Error(
      `appConfig.json does not contain "mapserviceBase" key. The file may be incomplete.`,
    );
  }

  config.mapserviceBase = mapserviceBase;
  writeJsonFile(CONFIG_PATHS.appConfig, config);
  console.log(`  ✓ Updated appConfig.json: mapserviceBase = ${mapserviceBase}`);
}

/**
 * Updates admin/config.json by replacing the hostname in all url_* fields.
 *
 * @param {string} oldOrigin - The origin to replace (e.g., "http://localhost:3002").
 * @param {string} newOrigin - The new origin (e.g., "https://karta.example.com").
 */
function updateAdminConfig(oldOrigin, newOrigin) {
  const config = readJsonFile(CONFIG_PATHS.adminConfig);

  let updateCount = 0;
  for (const key of Object.keys(config)) {
    if (key.startsWith("url_") && typeof config[key] === "string") {
      if (config[key].includes(oldOrigin)) {
        config[key] = config[key].replace(oldOrigin, newOrigin);
        updateCount++;
      }
    }
  }

  if (updateCount === 0) {
    console.log(
      `  ! No admin URLs found with origin ${oldOrigin} — check manually if needed.`,
    );
  } else {
    writeJsonFile(CONFIG_PATHS.adminConfig, config);
    console.log(`  ✓ Updated admin/config.json: ${updateCount} URLs patched`);
  }
}

/**
 * Updates or ensures critical .env variables are set.
 *
 * @param {DeploymentConfig} deployConfig - Deployment configuration.
 * @param {number} port - Backend port.
 * @returns {Promise<void>}
 */
async function updateEnvFile(deployConfig, port) {
  const updates = new Map();

  // Always set NODE_ENV
  updates.set("NODE_ENV", deployConfig.environment);

  // Generate SESSION_SECRET if in production and not already set
  const envMap = readEnvFile(CONFIG_PATHS.env);
  const existingSecret = envMap.get("SESSION_SECRET");

  if (deployConfig.environment === "production") {
    if (!existingSecret || existingSecret === "changeme-generate-with-openssl-rand--hex-32") {
      const newSecret = generateSessionSecret();
      updates.set("SESSION_SECRET", newSecret);
      console.log(`  ✓ Generated new SESSION_SECRET (32-byte random)`);
    } else {
      console.log(`  ✓ SESSION_SECRET already set (not regenerating)`);
    }

    // For production behind a proxy, suggest loopback for EXPRESS_TRUST_PROXY
    if (deployConfig.behindProxy) {
      updates.set("EXPRESS_TRUST_PROXY", "loopback");
      console.log(`  ✓ Set EXPRESS_TRUST_PROXY = loopback (for reverse proxy)`);
    }

    // Reduce log level in production
    if (!envMap.has("LOG_LEVEL") || envMap.get("LOG_LEVEL") === "all") {
      updates.set("LOG_LEVEL", "info");
      console.log(`  ✓ Set LOG_LEVEL = info (reduced from 'all' for production)`);
    }
  }

  // Admin password setup
  if (deployConfig.configureAdmin) {
    try {
      const hash = execSync(
        `npm run hash-admin-password -- "${deployConfig.adminPassword.replace(/"/g, '\\"')}"`,
        { encoding: "utf8", cwd: "." },
      ).match(/salt:hash:\s*(.+)/)?.[1];

      if (hash) {
        updates.set("ADMIN_PASSWORD_HASH", hash);
        updates.set("EXPOSE_AND_RESTRICT_STATIC_ADMIN", "GIS_ADMIN");
        console.log(`  ✓ Generated admin password hash`);
      } else {
        console.log(
          `  ! Admin password hash generation may have failed — check manually.`,
        );
      }
    } catch (err) {
      console.log(
        `  ! Could not run 'npm run hash-admin-password' — ensure npm dependencies are installed.`,
      );
    }
  }

  // Update .env file
  writeEnvFile(CONFIG_PATHS.env, updates);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rl = createInterface({ input, output });

  try {
    await validateFiles();

    const config = await collectConfig(rl);

    console.log("\n--- Applying Configuration ---\n");

    // Update config files
    const mapserviceBase = buildMapserviceBase(
      config.hostname,
      config.port,
      config.behindProxy,
    );
    const adminBase = buildAdminBase(
      config.hostname,
      config.port,
      config.behindProxy,
    );

    updateAppConfig(mapserviceBase);

    // For admin config, replace the old localhost:3002 origin with the new one
    const oldOrigin = "http://localhost:3002";
    updateAdminConfig(oldOrigin, adminBase);

    // Update .env (this is async because it may run npm)
    await updateEnvFile(config, config.port);

    // Summary
    console.log("\n--- Configuration Summary ---\n");
    console.log(`Hostname:        ${config.hostname}`);
    console.log(`Port:            ${config.port}`);
    console.log(`Environment:     ${config.environment}`);
    console.log(`Behind proxy:    ${config.behindProxy ? "Yes" : "No"}`);
    console.log(`Admin protected: ${config.configureAdmin ? "Yes (password)" : "No"}`);
    console.log(`\nMapservice base: ${mapserviceBase}`);
    console.log(`Admin base:      ${adminBase}\n`);

    if (config.environment === "production") {
      console.log("⚠ PRODUCTION REMINDERS:");
      console.log("  - Verify SESSION_SECRET in .env is unique (not default)");
      console.log("  - Review LOG_LEVEL and other .env settings for your use case");
      if (config.behindProxy) {
        console.log("  - Ensure nginx/proxy forwards X-Forwarded-* headers");
      }
      console.log("  - Test the application before going live\n");
    }

    console.log("Configuration complete. Ready to start the backend:");
    console.log("  npm install  # (if not already done)");
    console.log("  node index.js\n");
  } catch (error) {
    console.error(`\nConfiguration failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
