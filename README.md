# MietexTools 🛠️

A repository containing various utility tools that automate everyday development and administrative tasks.

## 📦 Project structure

```
MietexTools/
├── packages/           # Tools (one subdirectory = one tool)
│   ├── deploy-ftp/     # CLI for deploying files via FTP
│   └── ...             # More tools
├── skills/             # Skills for AI assistants (.skill.md)
├── scripts/            # Shared helper scripts
├── README.md
└── LICENSE
```

## 🧰 Available tools

| Tool | Category | Description | Documentation |
|-----------|-----------|------|------|
| `deploy-ftp` | CLI | Deploy files to an FTP server with zero-downtime rotation | [`deploy-ftp.skill.md`](./skills/deploy-ftp.skill.md) |

### CLI

CLI tools are built with **TypeScript/Node.js** and run via `npx` or directly.

## 🎯 AI Skills

Each tool comes with a `.skill.md` file — instructions for AI assistants (e.g., GitHub Copilot) describing how to use the tool. Skills are located in the [`skills/`](./skills/) directory.

## 🚀 How to use

### Directly from the repository

```bash
# Run the tool without installation
npx tsx packages/deploy-ftp/src/index.ts --help

# Initialize configuration
npx tsx packages/deploy-ftp/src/index.ts --init --key "your-key"

# Deploy
npx tsx packages/deploy-ftp/src/index.ts --key "your-key"
```

### After installation

```bash
# Install the tool globally
npm install -g ./packages/deploy-ftp

# Use
deploy-ftp --help
```

## 🛠️ Adding a new tool

1. Create a directory in `packages/<tool-name>/`
2. Add `package.json` and `tsconfig.json`
3. Implement the logic in `src/`
4. Create a skill in `skills/<tool-name>.skill.md`



## Publishing to npm

To publish a new version of `deploy-ftp` (or any other tool in this monorepo) to npm, run the interactive publish script from the repository root:

```bash
npm run publish
```

The script will:
1. Check if you are logged in to npm
2. Show a list of publishable (non-private) packages
3. Let you select a specific package or all packages
4. Prompt for version bump type (`patch` / `minor` / `major`)
5. Bump the version, build, and publish

> The `@mietextools/deploy-ftp` package is configured with `"publishConfig": { "access": "public" }` so it can be published as a public scoped package.



## 📄 License

MIT — see [LICENSE](./LICENSE).