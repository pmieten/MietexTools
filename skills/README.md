# 🎯 AI Skills

This directory contains `.skill.md` files — instructions for AI assistants (GitHub Copilot and others) that describe how to use the tools in this repository.

## Structure

```
skills/
├── README.md
├── _template.skill.md       # Template for creating new skills
└── <tool>.skill.md          # Skill for a specific tool
```

## How skills work

A `.skill.md` file tells the AI assistant:
- **When** to offer the tool (e.g., when the user mentions FTP, deploy, etc.)
- **How** to use it (examples, syntax, options)
- **What** dependencies and requirements exist

## Naming convention

`<tool>.skill.md` — e.g. `deploy-ftp.skill.md`

## Installation in VS Code

For a skill to be active in VS Code, place the `.skill.md` file (or a link to it) in:

```
.vscode/  # locally in the project
```
or
```
%APPDATA%\Code\User\prompts\  # globally
```