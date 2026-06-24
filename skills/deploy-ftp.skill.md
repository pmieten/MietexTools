---
name: deploy-ftp
description: CLI tool for deploying files to an FTP server with zero-downtime rotation
---

# deploy-ftp

## Description
CLI tool for deploying files to an FTP server with zero-downtime rotation.
It creates a backup of the current version before swapping to the new one and keeps a maximum number of backup copies.

## Requirements
- Node.js >= 18
- Usage from monorepo: `npx tsx packages/deploy-ftp/src/index.ts`

## Usage

### Initialize configuration (interactive wizard)
```bash
deploy-ftp --init --key "your-key"
```
The password will be encrypted with AES-256-GCM and saved to `%USERPROFILE%\.mietextools\deploy-ftp.json`.

### Change only password/credentials
```bash
deploy-ftp --init --credential --key "your-key"
```
Keeps all other settings (host, port, paths).

### Deploy
```bash
deploy-ftp --key "your-key"
```

### Options

| Flag | Description |
|-------|------|
| `--init, -i` | Run the interactive configuration wizard |
| `-c, --credential` | (with `--init`) Credentials only, rest unchanged |
| `-k, --key <passphrase>` | Password encryption key (AES-256-GCM) |
| `--help, -h` | Show help |

The password can also be passed via the `FTP_DEPLOY_KEY` environment variable.

## Deploy strategy

1. `pnpm build` — builds the application
2. Upload `dist/` to `{pathToApp}/{currentApp}-temp`
3. Rename `{currentApp}` → `{currentApp}-YYYY-MM-DD-HHmmss` (backup)
4. Rename `{currentApp}-temp` → `{currentApp}` (zero-downtime swap)
5. If backups > `keepBackups`, remove oldest

## Configuration file

Location: `%USERPROFILE%\.mietextools\deploy-ftp.json`

```json
{
  "host": "ftp.example.com",
  "port": 21,
  "user": "username",
  "password": "salt:iv:tag:ciphertext",
  "secure": false,
  "pathToApp": "/domains/domain.name.com",
  "currentApp": "my-app",
  "localDist": "dist",
  "keepBackups": 10
}
```

## Examples

```bash
# Initialize with encryption
deploy-ftp --init --key "super-secret"

# Change only password
deploy-ftp --init --credential --key "super-secret"

# Deploy
deploy-ftp --key "super-secret"

# Deploy via environment variable
export FTP_DEPLOY_KEY="super-secret"
deploy-ftp
```

## Notes
- Config with passwords is kept in `%USERPROFILE%\.mietextools\` — outside the repository
- Without `--key` the password is stored in plaintext — not recommended
- The key (`--key`) can be safely committed to Git (without it the encrypted password is useless)

