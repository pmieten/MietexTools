#!/usr/bin/env node

/**
 * MietexTools: deploy-ftp
 *
 * Zero-downtime FTP deployment CLI.
 *
 * Strategy:
 *   1. Build the application
 *   2. Upload new version to "{pathToApp}/{currentApp}-temp"
 *   3. Rename "{currentApp}" → "{currentApp}-YYYY-MM-DD-HHmmss" (backup)
 *   4. Rename "{currentApp}-temp" → "{currentApp}" (zero-downtime swap)
 *   5. Keep max N backups, remove oldest
 *
 * Config file path is provided via --config <path> (no default).
 */

import { deploy } from "./commands/deploy.js";
import { initConfig } from "./commands/init.js";
import type { FtpConfigOverrides } from "./utils/config.js";

// ─── CLI arguments ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string, ...aliases: string[]): string | null {
  const allNames = [name, ...aliases];
  for (const n of allNames) {
    const idx = args.findIndex((a) => a === n);
    if (idx !== -1 && idx < args.length - 1) return args[idx + 1];
    // Also support --key=value
    const eqIdx = args.findIndex((a) => a.startsWith(`${n}=`));
    if (eqIdx !== -1) return args[eqIdx].slice(n.length + 1);
  }
  return null;
}

function getEncryptionKey(): string | null {
  if (process.env.FTP_DEPLOY_KEY) return process.env.FTP_DEPLOY_KEY;
  return getFlag("--key", "-k");
}

function getConfigPath(): string | null {
  return getFlag("--config", "-C");
}

function hasFlag(...flags: string[]): boolean {
  return flags.some((f) => args.includes(f));
}

/** Parse CLI override flags into an FtpConfigOverrides object */
function parseOverrides(): FtpConfigOverrides {
  const overrides: FtpConfigOverrides = {};
  const host = getFlag("--host");
  if (host) overrides.host = host;
  const port = getFlag("--port");
  if (port) overrides.port = parseInt(port, 10);
  const user = getFlag("--user", "-u");
  if (user) overrides.user = user;
  const password = getFlag("--password", "-p");
  if (password) overrides.password = password;
  const path = getFlag("--path");
  if (path) overrides.pathToApp = path;
  const app = getFlag("--app-folder");
  if (app) overrides.currentApp = app;
  const dist = getFlag("--local-dist");
  if (dist) overrides.localDist = dist;
  const backups = getFlag("--keep-backups");
  if (backups) overrides.keepBackups = parseInt(backups, 10);
  if (hasFlag("--secure")) overrides.secure = true;
  if (hasFlag("--no-secure")) overrides.secure = false;
  return overrides;
}

// ─── Entry point ────────────────────────────────────────────────────────────

const encKey = getEncryptionKey();
const configPath = getConfigPath();

if (hasFlag("--init", "-i") && hasFlag("--credential", "-c")) {
  await initConfig(configPath, encKey, true);
} else if (hasFlag("--init", "-i")) {
  await initConfig(configPath, encKey, false);
} else if (hasFlag("--help", "-h")) {
  console.log(`
Usage: deploy-ftp [options]

Options:
  -C, --config <path>   Path to config JSON file (required for deploy; prompted in --init if omitted)
  --init, -i             Create / update FTP config
  -c, --credential       (with --init) Only prompt for username/password
  -k, --key <passphrase> Encryption key — password is encrypted in config
  --host <host>          FTP server address (overrides config / env: FTP_HOST)
  --port <port>          FTP port (overrides config / env: FTP_PORT)
  -u, --user <username>  FTP username (overrides config / env: FTP_USER)
  -p, --password <pwd>   FTP password (overrides config / env: FTP_PASSWORD)
  --path <path>          Remote path (overrides config / env: FTP_PATH)
  --app-folder <name>    Remote app folder (overrides config / env: FTP_APP_FOLDER)
  --local-dist <dir>     Local dist folder (overrides config / env: FTP_LOCAL_DIST)
  --keep-backups <n>     Max backups to keep (overrides config / env: FTP_KEEP_BACKUPS)
  --secure               Use FTPS/TLS (overrides config / env: FTP_SECURE=true)
  --no-secure            Disable FTPS/TLS
  --help, -h             Show this help

Examples:
  deploy-ftp --config "%USERPROFILE%\\.mietextools\\deploy-ftp.json"
  deploy-ftp --init --config "%USERPROFILE%\\.mietextools\\myproject.json" --key "my-passphrase"
  deploy-ftp --config "%USERPROFILE%\\.mietextools\\deploy-ftp.json" --key "my-passphrase"

Environment variables: FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD,
  FTP_PATH, FTP_APP_FOLDER, FTP_LOCAL_DIST, FTP_KEEP_BACKUPS,
  FTP_SECURE, FTP_DEPLOY_KEY
  `);
} else {
  if (!configPath) {
    console.error("[✖] --config <path> is required. Provide the path to your config file.");
    console.error("    Example: deploy-ftp --config \"%USERPROFILE%\\.mietextools\\deploy-ftp.json\"");
    console.error("    Or run: deploy-ftp --init --config <path>\n");
    process.exit(1);
  }
  await deploy(configPath, encKey, parseOverrides());
}