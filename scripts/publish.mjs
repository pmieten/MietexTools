#!/usr/bin/env node

/**
 * MietexTools – Interactive npm publish script
 *
 * Prompts the user to select a package (or all packages),
 * bumps the version, builds, and publishes to npm.
 *
 * Usage:
 *   node scripts/publish.mjs
 *
 * Requirements:
 *   - npm logged in (`npm whoami`)
 *   - packages/ must contain publishable packages (not private)
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Helpers ────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  const result = execSync(cmd, { cwd: ROOT, stdio: "inherit", ...opts });
  return result ? result.toString().trim() : "";
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim();
}

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans); }));
}

/**
 * Returns all non-private packages from packages/ directory.
 */
function getPackages() {
  const dirs = readdirSync(resolve(ROOT, "packages"), { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory())
    .map((d) => {
      try {
        const pkgPath = resolve(ROOT, "packages", d.name);
        const meta = JSON.parse(readFileSync(resolve(pkgPath, "package.json"), "utf-8"));
        if (meta.private) return null;
        return { dir: d.name, path: pkgPath, packageJson: meta };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Prompts for a version bump type.
 */
async function askBumpType() {
  const valid = ["patch", "minor", "major"];
  const raw = await ask("Version bump (patch | minor | major) [patch]: ");
  const bump = raw.trim().toLowerCase();
  return valid.includes(bump) ? bump : "patch";
}

/**
 * Prompts for an npm OTP (2FA code) if the user wants to provide one.
 */
async function askOtp() {
  const raw = await ask("npm OTP (one-time password / 2FA code) [leave empty if none]: ");
  return raw.trim();
}

async function main() {
  console.log("\n📦  MietexTools – Package Publisher\n");

  // 1. Check npm authentication
  try {
    const who = runCapture("npm whoami");
    console.log(`✅  Logged in to npm as: \x1b[1m${who}\x1b[22m\n`);
  } catch {
    console.log("❌  You are not logged into npm. Run \x1b[1mnpm login\x1b[22m first.\n");
    process.exit(1);
  }

  // 2. Detect publishable packages
  const packages = getPackages();
  if (packages.length === 0) {
    console.log("No publishable packages found in packages/.\n");
    process.exit(0);
  }

  console.log("Publishable packages:");
  packages.forEach((p, i) => {
    console.log(`  [${i + 1}]  \x1b[36m${p.packageJson.name}\x1b[39m  (v${p.packageJson.version})`);
  });
  console.log(`  [${packages.length + 1}]  \x1b[33mAll packages\x1b[39m\n`);

  const sel = await ask(`Select package to publish (1-${packages.length + 1}): `);
  const idx = parseInt(sel, 10) - 1;

  let selected;
  if (idx === packages.length) {
    selected = packages;
  } else if (idx >= 0 && idx < packages.length) {
    selected = [packages[idx]];
  } else {
    console.log("Invalid selection.\n");
    process.exit(1);
  }

  // 3. Version bump
  const versionBump = await askBumpType();

  // 4. Publish each selected package
  for (const pkg of selected) {
    console.log(`\n────────────────────────────────────────────────`);
    console.log(`  \x1b[36m${pkg.packageJson.name}\x1b[39m`);
    console.log(`────────────────────────────────────────────────\n`);

    // Bump version
    console.log(`→ Bumping \x1b[1m${versionBump}\x1b[22m version...`);
    run(`npm version ${versionBump}`, { cwd: pkg.path });

    // Re-read package.json to get the new version
    const updatedMeta = JSON.parse(readFileSync(resolve(pkg.path, "package.json"), "utf-8"));

    // Build
    console.log(`→ Building...`);
    run(`npm run build`, { cwd: pkg.path });

    // Publish
    const otp = await askOtp();
    const otpFlag = otp ? ` --otp=${otp}` : "";
    console.log(`→ Publishing \x1b[1m${updatedMeta.name}@${updatedMeta.version}\x1b[22m...`);
    run(`npm publish${otpFlag}`, { cwd: pkg.path });

    console.log(`\n✅  Published \x1b[1m${updatedMeta.name}@${updatedMeta.version}\x1b[22m successfully!\n`);
  }

  console.log("✨  All done!\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
