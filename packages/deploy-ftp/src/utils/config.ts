import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { decrypt, encrypt } from "./crypto.js";

export interface FtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  pathToApp: string;
  currentApp: string;
  localDist: string;
  keepBackups: number;
}

/** All fields optional — used for CLI flag / env var overrides on top of saved config */
export interface FtpConfigOverrides {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  pathToApp?: string;
  currentApp?: string;
  localDist?: string;
  keepBackups?: number;
}

/**
 * Return the default config path under the user's home directory.
 */
export function defaultConfigPath(): string {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return `${home}\\.mietextools\\deploy-ftp.json`;
}

/**
 * Load config from disk. Returns null if file doesn't exist.
 * Decrypts password if encrypted and key provided.
 */
export function loadConfig(configPath: string, key?: string | null): FtpConfig | null {
  if (!existsSync(configPath)) return null;
  try {
    const raw: FtpConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    if (raw.password && raw.password.includes(":") && key) {
      try {
        raw.password = decrypt(raw.password, key);
      } catch {
        console.error("[✖] Failed to decrypt password — wrong --key?");
        process.exit(1);
      }
    }
    return raw;
  } catch {
    console.error(`[✖] Invalid JSON in ${configPath}`);
    process.exit(1);
  }
}

/**
 * Apply overrides (CLI flags) and environment variables on top of a base config.
 * Priority (high → low): CLI overrides > env vars > config file > defaults.
 */
export function applyOverrides(
  base: Partial<FtpConfig>,
  overrides: FtpConfigOverrides,
): FtpConfig {
  return {
    host: overrides.host ?? process.env.FTP_HOST ?? base.host ?? "",
    port: overrides.port ?? (process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : undefined) ?? base.port ?? 21,
    user: overrides.user ?? process.env.FTP_USER ?? base.user ?? "",
    password: overrides.password ?? process.env.FTP_PASSWORD ?? base.password ?? "",
    secure: overrides.secure ?? (process.env.FTP_SECURE ? process.env.FTP_SECURE === "true" : undefined) ?? base.secure ?? false,
    pathToApp: overrides.pathToApp ?? process.env.FTP_PATH ?? base.pathToApp ?? "",
    currentApp: overrides.currentApp ?? process.env.FTP_APP_FOLDER ?? base.currentApp ?? "",
    localDist: overrides.localDist ?? process.env.FTP_LOCAL_DIST ?? base.localDist ?? "dist",
    keepBackups: overrides.keepBackups ?? (process.env.FTP_KEEP_BACKUPS ? parseInt(process.env.FTP_KEEP_BACKUPS, 10) : undefined) ?? base.keepBackups ?? 10,
  };
}

/**
 * Resolve config: load from file (if exists), apply overrides, validate, return.
 * Exits with error if required fields (host, user, password, pathToApp, currentApp) are missing.
 */
export function resolveConfig(configPath: string, key: string | null, overrides: FtpConfigOverrides): FtpConfig {
  const fileConfig = loadConfig(configPath, key);
  const cfg = applyOverrides(fileConfig ?? {}, overrides);

  if (!cfg.host || !cfg.user || !cfg.password || !cfg.pathToApp || !cfg.currentApp) {
    console.error("[✖] Missing required config. Provide via config file, CLI flags, or env vars.");
    console.error("    Required: --host, --user, --password, --path, --app-folder");
    console.error("    Or run: deploy-ftp --init\n");
    process.exit(1);
  }

  return cfg;
}

/**
 * Save config to disk. Encrypts password if an encryption key is provided.
 */
export function saveConfig(configPath: string, cfg: FtpConfig, key?: string | null): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const toSave = { ...cfg };
  if (key && toSave.password) {
    toSave.password = encrypt(toSave.password, key);
  }
  writeFileSync(configPath, JSON.stringify(toSave, null, 2), "utf-8");
  if (key) {
    console.log(`[✔] Config saved to ${configPath} (password encrypted)`);
  } else {
    console.log(`[⚠] Config saved to ${configPath} (password PLAINTEXT — use --key to encrypt)`);
  }
}