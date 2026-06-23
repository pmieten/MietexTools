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
 * Credentials stored in: %USERPROFILE%\.mietextools\deploy-ftp.json
 * (never in the repository)
 */

import { deploy } from "./commands/deploy.js";
import { initConfig } from "./commands/init.js";
import { CONFIG_PATH } from "./utils/config.js";

// ─── CLI arguments ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getEncryptionKey(): string | null {
  const idx = args.findIndex((a) => a === "--key" || a === "-k");
  if (idx !== -1 && idx < args.length - 1) return args[idx + 1];
  if (process.env.FTP_DEPLOY_KEY) return process.env.FTP_DEPLOY_KEY;
  return null;
}

function hasFlag(...flags: string[]): boolean {
  return flags.some((f) => args.includes(f));
}

// ─── Entry point ────────────────────────────────────────────────────────────

const encKey = getEncryptionKey();

if (hasFlag("--init", "-i") && hasFlag("--credential", "-c")) {
  await initConfig(encKey, true);
} else if (hasFlag("--init", "-i")) {
  await initConfig(encKey, false);
} else if (hasFlag("--help", "-h")) {
  console.log(`
Usage: deploy-ftp [options]

Options:
  --init, -i             Create / update FTP config
  -c, --credential       (with --init) Only prompt for username/password
  -k, --key <passphrase> Encryption key — password is encrypted in config
  --help, -h             Show this help

Config stored at: ${CONFIG_PATH}
  `);
} else {
  await deploy(encKey);
}