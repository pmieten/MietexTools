import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";
import { resolveConfig } from "../utils/config.js";
import type { FtpConfigOverrides } from "../utils/config.js";
import { log, timestamp } from "../utils/helpers.js";
import { connect, listDir, ensureDir, createTempDir, uploadDir, renameRemote, removeDir } from "../utils/ftp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

/**
 * Run the full deploy pipeline:
 * build → upload to temp → rename current → rename temp → cleanup backups.
 */
export async function deploy(configPath: string, key: string | null, overrides: FtpConfigOverrides = {}): Promise<void> {
  const cfg = resolveConfig(configPath, key, overrides);
  const tempSuffix = "-temp";
  const appFolder = cfg.currentApp;
  const tempFolder = appFolder + tempSuffix;
  const basePath = cfg.pathToApp;

  // 1. Build
  log("INFO", "Step 1/5: Building application …");
  try {
    execSync("pnpm build", { cwd: PROJECT_ROOT, stdio: "inherit" });
  } catch {
    log("ERROR", "Build failed. Aborting.");
    process.exit(1);
  }
  log("OK", "Build complete.");

  // 2. FTP upload
  log("INFO", "Step 2/5: Connecting to FTP …");
  const client = new Client();
  client.ftp.verbose = false;

  try {
    await connect(client, cfg);
    log("OK", `Connected to ${cfg.host}`);

    await ensureDir(client, basePath);
    // CWD is now basePath

    const items = await listDir(client, ".");
    const backupCandidates = items
      .filter((i: any) => i.type === 2 && i.name.startsWith(appFolder))
      .map((i: any) => i.name);

    const hasExisting = backupCandidates.includes(appFolder);

    // Upload to temp folder
    log("INFO", "Step 3/5: Uploading new version …");
    const tempDirFull = `${basePath}/${tempFolder}`;
    await createTempDir(client, tempDirFull, basePath);
    await uploadDir(client, cfg.localDist, tempDirFull);
    log("OK", `Upload complete → ${tempDirFull}`);

    // 3. Rename current → backup
    log("INFO", "Step 4/5: Rotating releases …");
    if (hasExisting) {
      const backupName = `${appFolder}-${timestamp()}`;
      log("INFO", `Renaming ${basePath}/${appFolder} → ${basePath}/${backupName}`);
      await renameRemote(client, appFolder, backupName);
    }

    // 4. Rename temp → current
    log("INFO", `Renaming ${tempDirFull} → ${basePath}/${appFolder}`);
    await renameRemote(client, tempFolder, appFolder);
    log("OK", `Release swapped: ${tempDirFull} → ${basePath}/${appFolder}`);

    // 5. Cleanup old backups
    log("INFO", "Step 5/5: Cleaning old backups …");
    const allBackups = (await listDir(client, "."))
      .filter((i: any) => i.type === 2 && i.name.startsWith(appFolder) && i.name !== appFolder)
      .sort((a: any, b: any) => b.modifiedAt - a.modifiedAt);

    const keep = cfg.keepBackups || 10;
    if (allBackups.length > keep) {
      const toRemove = allBackups.slice(keep);
      for (const item of toRemove) {
        log("WARN", `Removing ${basePath}/${item.name}`);
        await removeDir(client, item.name);
      }
      log("OK", `Removed ${toRemove.length} old backup(s) from ${basePath}.`);
    }

    log("OK", `\nDeploy to ${cfg.host}${basePath}/${appFolder} completed successfully!`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Deploy failed: ${msg}`);
    process.exit(1);
  } finally {
    client.close();
  }
}