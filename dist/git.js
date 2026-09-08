import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export function runGit(args, cwd) {
    return execFileSync("git", args, {
        cwd,
        encoding: "utf8",
    }).trim();
}
export function getRepoRoot(cwd) {
    return runGit(["rev-parse", "--show-toplevel"], cwd);
}
export function getCurrentBranch(cwd) {
    return runGit(["branch", "--show-current"], cwd);
}
export function getChangedFiles(cwd) {
    const output = runGit(["diff", "--name-only", "main...HEAD"], cwd);
    if (!output) {
        return [];
    }
    return output.split("\n");
}
export function createBaseWorktree(cwd) {
    const tempPath = mkdtempSync(join(tmpdir(), "prproof-"));
    runGit(["worktree", "add", "--detach", tempPath, "main"], cwd);
    return tempPath;
}
export function removeWorktree(repoRoot, worktreePath) {
    runGit(["worktree", "remove", "--force", worktreePath], repoRoot);
}
