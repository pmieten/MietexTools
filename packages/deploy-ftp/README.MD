# @mietextools/deploy-ftp

A **zero-downtime FTP deployment CLI** tool. It uploads a built application to an FTP server and performs an atomic folder swap so that the live site never sees a half-uploaded version. Old releases are kept as backups with automatic cleanup.

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Deploy Logic](#deploy-logic)
- [Encryption](#encryption)
- [CLI Options](#cli-options)
- [Project Structure](#project-structure)

---

## Installation

```bash
npm install -g @mietextools/deploy-ftp
```

Or via `pnpm`:

```bash
pnpm add -g @mietextools/deploy-ftp
```

## Usage Without Installation

You can run `deploy-ftp` directly without installing it globally using `npx` or `pnpm dlx`:

```bash
# Using npx (comes with Node.js)
npx @mietextools/deploy-ftp --init

npx @mietextools/deploy-ftp

npx @mietextools/deploy-ftp --key "my-passphrase"
```

```bash
# Using pnpm dlx
pnpm dlx @mietextools/deploy-ftp --init

pnpm dlx @mietextools/deploy-ftp

pnpm dlx @mietextools/deploy-ftp --key "my-passphrase"
```

This is especially useful for CI/CD pipelines or one-off deployments where you don't want to permanently install the package.

---

## Configuration

Credentials and deployment settings are stored in:

```
%USERPROFILE%\.mietextools\deploy-ftp.json
```

> **Important:** This file is stored in your home directory, **never in the repository**, keeping credentials safe from accidental commits.

### Interactive Setup

Run the interactive configuration wizard:

```bash
deploy-ftp --init
```

The wizard prompts for:

| Setting | Description | Required |
|---------|-------------|----------|
| FTP host | Server address (e.g. `ftp.example.com`) | ✅ |
| FTP port | Port number (default: `21`) | ✅ |
| FTP username | Login username | ✅ |
| FTP password | Login password | ✅ |
| FTPS/TLS | Use secure FTP (y/N) | — |
| Remote path | Remote base path (e.g. `/public_html`) | ✅ |
| App folder name | Name of the live app folder on server | ✅ |
| Local dist folder | Local build output (default: `dist`) | — |
| Max backups | Number of old releases to keep (default: `10`) | — |

### Update Credentials Only

```bash
deploy-ftp --init --credential
```

Reuses existing config and only prompts for username/password — useful for rotating credentials without re-entering all settings.

---

## Usage

### Deploy

Simply run the command to execute the full deploy pipeline:

```bash
deploy-ftp
```

Or with an encryption key:

```bash
deploy-ftp --key "my-secret-passphrase"
```

The encryption key can also be set via the environment variable:

```bash
export FTP_DEPLOY_KEY="my-secret-passphrase"
deploy-ftp
```

### Run Without a Config File

You can deploy without ever running `--init` by passing all required settings via CLI flags or environment variables:

**Via CLI flags:**
```bash
deploy-ftp \
  --host ftp.example.com \
  --user john \
  --password "s3cret" \
  --path /public_html \
  --app-folder myapp \
  --local-dist dist \
  --keep-backups 5
```

**Via environment variables:**
```bash
export FTP_HOST=ftp.example.com
export FTP_USER=john
export FTP_PASSWORD=s3cret
export FTP_PATH=/public_html
export FTP_APP_FOLDER=myapp
deploy-ftp
```

**Mix & match** — CLI flags override env vars, which override the config file:

```bash
# Most settings from config file, override app folder for a one-off deploy
deploy-ftp --app-folder myapp-staging
```

---

## Deploy Logic

The deploy pipeline consists of **5 steps**:

```
Step 1/5: Build application     →  pnpm build
Step 2/5: Connect to FTP        →  Login using saved config
Step 3/5: Upload new version    →  Upload dist/ to {path}/{app}-temp
Step 4/5: Rotate releases       →  Rename {app} → {app}-{timestamp} (backup)
                                  Rename {app}-temp → {app} (atomic swap)
Step 5/5: Clean old backups     →  Remove backups beyond keepBackups count
```

### Why zero-downtime?

1. The new build is uploaded to a **temporary folder** (`{appName}-temp`) — the live site keeps running on the current version.
2. Once upload is complete, the current folder is **renamed to a timestamped backup**.
3. The temp folder is **renamed to the live folder name** — this is near-instantaneous on most FTP servers.
4. **Visitors never see a partial deployment.**

Old releases are automatically cleaned up, keeping only the N most recent backups (configurable, default 10).

---

## Encryption

Passwords can be stored encrypted using **AES-256-GCM** with key derivation via **PBKDF2** (600,000 iterations, SHA-512).

- Encrypted format: `salt:iv:authTag:ciphertext` (all hex)
- Provide the passphrase via `--key <passphrase>` or `FTP_DEPLOY_KEY` env variable

```bash
# During init — password is encrypted before saving
deploy-ftp --init --key "my-passphrase"

# During deploy — password is decrypted automatically
deploy-ftp --key "my-passphrase"
```

If no key is provided, the password is stored in **plaintext** (a warning is shown).

---

## CLI Options

| Flag | Alias | Description |
|------|-------|-------------|
| _(none)_ | — | Run the full deploy pipeline |
| `--init` | `-i` | Interactive configuration wizard |
| `--init --credential` | `-i -c` | Update only username/password |
| `--key <passphrase>` | `-k` | Encryption key for the password |
| `--host <host>` | — | FTP server address |
| `--port <port>` | — | FTP port (default: 21) |
| `--user <username>` | `-u` | FTP username |
| `--password <pwd>` | `-p` | FTP password |
| `--path <path>` | — | Remote path (e.g. `/public_html`) |
| `--app-folder <name>` | — | Remote app folder name |
| `--local-dist <dir>` | — | Local dist folder (default: `dist`) |
| `--keep-backups <n>` | — | Max backups to keep (default: 10) |
| `--secure` / `--no-secure` | — | Enable / disable FTPS/TLS |
| `--help` | `-h` | Show help text |

### Environment Variables

All CLI flags have corresponding environment variables (lower priority than CLI flags):

| Env Variable | Equivalent Flag |
|---|---|
| `FTP_HOST` | `--host` |
| `FTP_PORT` | `--port` |
| `FTP_USER` | `--user` |
| `FTP_PASSWORD` | `--password` |
| `FTP_PATH` | `--path` |
| `FTP_APP_FOLDER` | `--app-folder` |
| `FTP_LOCAL_DIST` | `--local-dist` |
| `FTP_KEEP_BACKUPS` | `--keep-backups` |
| `FTP_SECURE` | `--secure` (set to `"true"`) |
| `FTP_DEPLOY_KEY` | `--key` |

---

## Project Structure

```
src/
├── index.ts              ← CLI entry point — argument parsing & routing
├── commands/
│   ├── deploy.ts         ← Deploy pipeline (build → upload → swap → cleanup)
│   └── init.ts           ← Interactive configuration wizard
└── utils/
    ├── config.ts         ← Load/save config JSON to ~/.mietextools/deploy-ftp.json
    ├── crypto.ts         ← AES-256-GCM encrypt/decrypt logic
    ├── ftp.ts            ← FTP helpers (connect, listDir, uploadDir, rename, remove)
    └── helpers.ts        ← timestamp() formatting & log() helper
```

---

## License

[MIT](../../LICENSE)