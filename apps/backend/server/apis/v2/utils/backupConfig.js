/**
 * @summary Timestamped, on-disk backups for App_Data config files.
 *
 * @description Every write path that overwrites (or deletes) a map config or the
 * layers store snapshots the *current* file first, into
 * `App_Data/.backups/<name>/<timestamp>[.label].json`. This is intentionally
 * transparent: callers add a single `backupBeforeWrite()` call and nothing about
 * the existing save workflow changes.
 *
 * Design notes:
 *  - Backing up must never break the primary operation. `backupBeforeWrite`
 *    swallows its own errors (a full disk or permission glitch degrades to
 *    "no backup this time", never "the save failed").
 *  - Backup file names are ISO timestamps with ':' and '.' replaced by '-', so
 *    a plain lexicographic sort equals chronological order.
 *  - Retention is per-file, count-based, configurable via
 *    MAP_CONFIG_BACKUP_COUNT (default 100). Oldest are pruned.
 */
import fs from "fs";
import path from "path";
import log4js from "log4js";

const logger = log4js.getLogger("service.backup.v2");

const BACKUPS_DIRNAME = ".backups";
const DEFAULT_KEEP = 100;

// Config file stems we ever back up look like "default_map-1" or "layers".
const VALID_NAME = /^[A-Za-z0-9_-]+$/;
// A backup file name is a timestamp, an optional ".label", then ".json".
const VALID_BACKUP_FILE = /^[A-Za-z0-9._-]+\.json$/;

function getKeepCount() {
  const n = Number(process.env.MAP_CONFIG_BACKUP_COUNT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_KEEP;
}

function appDataDir() {
  return path.join(process.cwd(), "App_Data");
}

/**
 * Validate a config name (file stem, without extension) before using it in a path.
 * @param {string} name
 * @returns {string} the trimmed, validated name
 */
function validateName(name) {
  if (typeof name === "string") {
    const trimmed = name.trim();
    if (VALID_NAME.test(trimmed)) return trimmed;
  }
  throw new Error("Invalid config name.");
}

/**
 * Validate a backup file identifier and strip any path components.
 * Guarantees the result can't escape the backup directory.
 * @param {string} id
 * @returns {string} a safe, bare file name
 */
function validateBackupFile(id) {
  if (typeof id === "string") {
    const base = path.basename(id); // defence in depth: removes any "../" or slashes
    if (base === id && VALID_BACKUP_FILE.test(base)) return base;
  }
  throw new Error("Invalid backup id.");
}

function backupDirForStem(stem) {
  return path.join(appDataDir(), BACKUPS_DIRNAME, stem);
}

function timestamp() {
  // 2026-07-13T14-32-05-123Z — fixed width, sorts chronologically as a string.
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * @summary Snapshot the current on-disk version of a file before it is
 * overwritten or deleted. Never throws.
 *
 * @param {string} fullPath Absolute or cwd-relative path to the live file.
 * @param {{ label?: string }} [options] Optional label, e.g. "pre-restore".
 */
export async function backupBeforeWrite(fullPath, { label } = {}) {
  try {
    // Read the file as it exists *now*. ENOENT means it's a brand new file,
    // so there is nothing to back up.
    const current = await fs.promises.readFile(fullPath);

    const stem = path.basename(fullPath, ".json");
    const dir = backupDirForStem(stem);
    await fs.promises.mkdir(dir, { recursive: true });

    const suffix = label ? `.${label}` : "";
    const backupFile = `${timestamp()}${suffix}.json`;
    await fs.promises.writeFile(path.join(dir, backupFile), current);

    await prune(dir);
  } catch (error) {
    if (error.code === "ENOENT") return; // Nothing to back up
    // A failed backup must not break the caller's save/delete. Log and move on.
    logger.warn(
      "[backupBeforeWrite] Could not create backup for %s: %s",
      fullPath,
      error.message
    );
  }
}

/**
 * Remove the oldest backups in a directory, keeping the configured maximum.
 * @param {string} dir
 */
async function prune(dir) {
  const keep = getKeepCount();
  const files = (await fs.promises.readdir(dir))
    .filter((f) => f.endsWith(".json"))
    .sort(); // ascending == oldest first

  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    await fs.promises.unlink(path.join(dir, files[i])).catch(() => {});
  }
}

/**
 * @summary List available backups for a given config name, newest first.
 *
 * @param {string} name Config name (file stem), e.g. "default" or "layers".
 * @returns {Promise<Array<{id: string, size: number, createdAt: string, label: string}>>}
 */
export async function listBackups(name) {
  const stem = validateName(name);
  const dir = backupDirForStem(stem);

  let entries;
  try {
    entries = await fs.promises.readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") return []; // No backups taken yet
    throw error;
  }

  const backups = [];
  for (const file of entries) {
    if (!file.endsWith(".json")) continue;
    const stat = await fs.promises.stat(path.join(dir, file));
    backups.push({
      id: file,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
      label: labelFromFile(file),
    });
  }

  // File names are timestamp-prefixed, so a reverse string sort is newest-first.
  backups.sort((a, b) => (a.id < b.id ? 1 : -1));
  return backups;
}

function labelFromFile(file) {
  // <timestamp>.pre-restore.json -> "pre-restore"; <timestamp>.json -> "save"
  const withoutExt = file.replace(/\.json$/, "");
  const dot = withoutExt.indexOf(".");
  return dot === -1 ? "save" : withoutExt.slice(dot + 1);
}

/**
 * @summary Read a single backup's contents (used for preview/diff).
 *
 * @param {string} name Config name (file stem).
 * @param {string} id Backup file identifier (from listBackups).
 * @returns {Promise<object>} Parsed JSON of the backup.
 */
export async function readBackup(name, id) {
  const stem = validateName(name);
  const file = validateBackupFile(id);
  const full = path.join(backupDirForStem(stem), file);
  const text = await fs.promises.readFile(full, "utf-8");
  return JSON.parse(text);
}

/**
 * @summary Restore a backup over the live config file.
 *
 * @description The current live file is snapshotted first (labeled
 * "pre-restore"), so a restore is itself reversible. If the live file was
 * previously deleted, restoring simply recreates it.
 *
 * @param {string} name Config name (file stem).
 * @param {string} id Backup file identifier (from listBackups).
 * @returns {Promise<{restored: string, from: string}>}
 */
export async function restoreBackup(name, id) {
  const stem = validateName(name);
  const file = validateBackupFile(id);

  const backupPath = path.join(backupDirForStem(stem), file);
  const livePath = path.join(appDataDir(), `${stem}.json`);

  // Read and validate the backup *before* touching the live file. If the
  // backup is unreadable or corrupt, abort without having changed anything.
  const backupText = await fs.promises.readFile(backupPath, "utf-8");
  JSON.parse(backupText); // throws on corrupt JSON

  // Snapshot the current live file so this restore can itself be undone.
  await backupBeforeWrite(livePath, { label: "pre-restore" });

  // Overwrite (or recreate) the live file with the backup contents.
  await fs.promises.writeFile(livePath, backupText);

  return { restored: `${stem}.json`, from: file };
}
