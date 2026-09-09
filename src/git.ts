import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function runGit(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function getRepoRoot(cwd: string): string {
  return runGit(["rev-parse", "--show-toplevel"], cwd);
}

export function getCurrentBranch(cwd: string): string {
  return runGit(["branch", "--show-current"], cwd);
}

export function getChangedFiles(cwd: string, baseRef: string): string[] {
  const output = runGit(
    ["diff", "--name-only", `${baseRef}...HEAD`],
    cwd
  );

  if (!output) {
    return [];
  }

  return output.split("\n");
}

export function createBaseWorktree(cwd: string, baseRef: string): string {
  const tempPath = mkdtempSync(
    join(tmpdir(), "prproof-")
  );

  runGit(
    ["worktree", "add", "--detach", tempPath, baseRef],
    cwd
  );

  return tempPath;
}


export function removeWorktree(
  repoRoot: string,
  worktreePath: string
): void {
  runGit(
    ["worktree", "remove", "--force", worktreePath],
    repoRoot
  );
}