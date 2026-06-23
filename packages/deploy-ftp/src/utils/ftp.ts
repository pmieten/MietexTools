import { Client } from "basic-ftp";
import type { FtpConfig } from "./config.js";
import { log } from "./helpers.js";

export async function listDir(client: Client, path: string) {
  try {
    return await client.list(path);
  } catch {
    return [];
  }
}

export async function ensureDir(client: Client, path: string) {
  try {
    await client.ensureDir(path);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot create remote directory "${path}": ${msg}`);
  }
}

/**
 * Create a directory on the remote server but CD back to basePath so CWD stays predictable.
 */
export async function createTempDir(client: Client, fullPath: string, basePath: string) {
  await ensureDir(client, fullPath);
  await client.cd(basePath);
}

export async function uploadDir(client: Client, localDir: string, remoteDir: string) {
  log("INFO", `Uploading ${localDir} → ${remoteDir} …`);
  await client.uploadFromDir(localDir, remoteDir);
}

export async function renameRemote(client: Client, from: string, to: string) {
  log("INFO", `Renaming ${from} → ${to}`);
  try {
    await client.rename(from, to);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Rename failed ${from} → ${to}: ${msg}`);
  }
}

export async function removeDir(client: Client, path: string) {
  log("WARN", `Removing ${path}`);
  try {
    await client.removeDir(path);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Could not remove ${path}: ${msg}`);
  }
}

export function connect(client: Client, cfg: FtpConfig) {
  return client.access({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    secure: cfg.secure,
    secureOptions: cfg.secure ? { rejectUnauthorized: false } : undefined,
  });
}