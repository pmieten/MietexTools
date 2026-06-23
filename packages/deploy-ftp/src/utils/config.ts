import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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

const CONFIG_DIR = join(homedir(), ".mietextools");
const CONFIG_PATH = join(CONFIG_DIR, "deploy-ftp.json");

/**
 * Load config from disk. Decrypts password if encrypted and key provided.
 */
export function loadConfig(key?: string | null): FtpConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`[✖] Config not found at ${CONFIG_PATH}`);
    console.error("\nRun: deploy-ftp init\n");
    process.exit(1);
  }
  try {
    const raw: FtpConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
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
    console.error(`[✖] Invalid JSON in ${CONFIG_PATH}`);
    process.exit(1);
  }
}

/**
 * Save config to disk. Encrypts password if an encryption key is provided.
 */
export function saveConfig(cfg: FtpConfig, key?: string | null): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  const toSave = { ...cfg };
  if (key && toSave.password) {
    toSave.password = encrypt(toSave.password, key);
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2), "utf-8");
  if (key) {
    console.log(`[✔] Config saved to ${CONFIG_PATH} (password encrypted)`);
  } else {
    console.log(`[⚠] Config saved to ${CONFIG_PATH} (password PLAINTEXT — use --key to encrypt)`);
  }
}

export { CONFIG_DIR, CONFIG_PATH };