#!/usr/bin/env bun
/**
 * ResolveBootContext - Inline identity loader for PAI launches
 *
 * Replaces the `@`-imports that used to live in `~/.claude/CLAUDE.md`:
 *   @PAI/USER/PRINCIPAL_IDENTITY.md
 *   @PAI/USER/DA_IDENTITY.md
 *   @PAI/USER/PROJECTS/PROJECTS.md
 *   @PAI/USER/TELOS/PRINCIPAL_TELOS.md
 *   @PAI/DOCUMENTATION/ARCHITECTURE_SUMMARY.md
 *
 * Those imports tripped Claude Code's external-imports trust prompt whenever
 * `cc` (CLAUDE_CONFIG_DIR=$HOME/.claude-cc) started in a new project, because
 * Claude Code 2.1.x reads $HOME/.claude/CLAUDE.md regardless of CLAUDE_CONFIG_DIR
 * and resolves its `@`-imports against the host filesystem. Moving identity
 * into the --append-system-prompt-file pipeline keeps it PAI-scoped because cc
 * does not pass that flag.
 *
 * Usage:
 *   import { resolveBootContext } from "./ResolveBootContext"
 *   const content = resolveBootContext()
 *
 * CLI:
 *   bun ResolveBootContext.ts            # prints to stdout
 *   bun ResolveBootContext.ts --write    # writes to PAI_BOOT_CONTEXT.md
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PAI_DIR = process.env.PAI_DIR || join(homedir(), ".claude", "PAI");

interface Source {
  label: string;
  path: string;
}

const SOURCES: Source[] = [
  { label: "Principal Identity", path: join(PAI_DIR, "USER", "PRINCIPAL_IDENTITY.md") },
  { label: "DA Identity", path: join(PAI_DIR, "USER", "DA_IDENTITY.md") },
  { label: "Active Projects", path: join(PAI_DIR, "USER", "PROJECTS", "PROJECTS.md") },
  { label: "Principal Telos", path: join(PAI_DIR, "USER", "TELOS", "PRINCIPAL_TELOS.md") },
  { label: "Architecture Summary", path: join(PAI_DIR, "DOCUMENTATION", "ARCHITECTURE_SUMMARY.md") },
];

export function resolveBootContext(): string {
  const parts: string[] = [
    "# PAI Boot Context",
    "",
    "> Auto-resolved at PAI launch by `PAI/TOOLS/ResolveBootContext.ts`.",
    "> Mirrors the content that `@`-imports used to load from `~/.claude/CLAUDE.md` before the cc-isolation refactor.",
    "",
    "---",
    "",
  ];

  for (const src of SOURCES) {
    parts.push(`## ${src.label}`);
    parts.push("");
    parts.push(`_Source: \`${src.path}\`_`);
    parts.push("");
    if (existsSync(src.path)) {
      parts.push(readFileSync(src.path, "utf-8").trimEnd());
    } else {
      parts.push(`> ⚠️ Source file missing: ${src.path}`);
    }
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  return parts.join("\n");
}

if (import.meta.main) {
  const content = resolveBootContext();
  const shouldWrite = process.argv.includes("--write");
  if (shouldWrite) {
    const outPath = join(PAI_DIR, "PAI_BOOT_CONTEXT.md");
    writeFileSync(outPath, content);
    console.log(`Wrote ${outPath} (${content.length} bytes)`);
  } else {
    process.stdout.write(content);
  }
}
