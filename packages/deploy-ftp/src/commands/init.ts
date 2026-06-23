import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { saveConfig, CONFIG_DIR, CONFIG_PATH } from "../utils/config.js";
import type { FtpConfig } from "../utils/config.js";
import { decrypt } from "../utils/crypto.js";

function ask(query: string): Promise<string> {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive wizard to create / update FTP config.
 */
export async function initConfig(key: string | null, credentialOnly: boolean): Promise<void> {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });

  let cfg: Partial<FtpConfig> = {};

  if (credentialOnly && existsSync(CONFIG_PATH)) {
    // Load existing non-credential fields
    const existing = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    if (key && existing.password && existing.password.includes(":")) {
      try {
        existing.password = decrypt(existing.password, key);
      } catch {
        // will overwrite
      }
    }
    cfg = existing;
    console.log("\n── Update FTP Credentials Only ──\n");
  } else {
    console.log("\n── FTP Deploy Configuration ──\n");
  }

  if (!credentialOnly || !cfg.host) {
    cfg.host = (await ask(`FTP host${cfg.host ? ` (${cfg.host})` : ""}: `)) || cfg.host || "";
  }
  if (!credentialOnly || !cfg.port) {
    cfg.port =
      parseInt(
        (await ask(`FTP port${cfg.port ? ` (${cfg.port})` : ""} (21): `)) || String(cfg.port || 21),
        10,
      );
  }
  cfg.user = (await ask(`FTP username${cfg.user ? ` (${cfg.user})` : ""}: `)) || cfg.user || "";
  cfg.password = await ask("FTP password: ");
  if (credentialOnly === false || cfg.secure === undefined) {
    const secureAns = await ask(
      `Use FTPS / TLS?${cfg.secure !== undefined ? ` (${cfg.secure ? "y" : "n"})` : ""} (y/N): `,
    );
    cfg.secure = secureAns.toLowerCase() === "y" || cfg.secure || false;
  }
  if (!credentialOnly || !cfg.pathToApp) {
    cfg.pathToApp =
      (await ask(`Remote pathToApp (e.g. /public_html)${cfg.pathToApp ? ` (${cfg.pathToApp})` : ""}: `)) ||
      cfg.pathToApp ||
      "";
  }
  if (!credentialOnly || !cfg.currentApp) {
    cfg.currentApp =
      (await ask(`Remote currentApp folder name${cfg.currentApp ? ` (${cfg.currentApp})` : ""}: `)) ||
      cfg.currentApp ||
      "";
  }
  if (!credentialOnly || !cfg.localDist) {
    cfg.localDist =
      (await ask(`Local dist folder${cfg.localDist ? ` (${cfg.localDist})` : ""} (default: dist): `)) ||
      cfg.localDist ||
      "dist";
  }
  if (!credentialOnly || !cfg.keepBackups) {
    cfg.keepBackups = parseInt(
      (await ask(`Max backups to keep${cfg.keepBackups ? ` (${cfg.keepBackups})` : ""} (default: 10): `)) ||
        String(cfg.keepBackups || 10),
      10,
    );
  }

  if (!cfg.host || !cfg.user || !cfg.password || !cfg.pathToApp || !cfg.currentApp) {
    console.error("[✖] host, user, password, pathToApp and currentApp are required.");
    process.exit(1);
  }

  saveConfig(cfg as FtpConfig, key);
}