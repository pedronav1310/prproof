import { createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree, } from "./git.js";
import { copyTestsToBase, linkNodeModules, runTests, } from "./tests.js";
import { inspectChanges, } from "./inspect.js";
import { classifyProof, } from "./proof.js";
export function verifyRepository(targetRepo, baseRef, mode) {
    const repoRoot = getRepoRoot(targetRepo);
    const changedFiles = getChangedFiles(targetRepo, baseRef);
    const inspection = inspectChanges(changedFiles);
    const changedTestFiles = inspection.testFiles;
    if (inspection.kind === "production-without-tests") {
        return {
            type: "insufficient-evidence",
            repoRoot,
            baseRef,
            inspection
        };
    }
    if (inspection.kind === "test-only") {
        return {
            type: "test-only",
            repoRoot,
            baseRef,
            inspection,
        };
    }
    if (inspection.kind === "other-only") {
        return {
            type: "no-proof-required",
            repoRoot,
            baseRef,
            inspection,
        };
    }
    const baseWorktree = createBaseWorktree(repoRoot, baseRef);
    try {
        linkNodeModules(repoRoot, baseWorktree);
        copyTestsToBase(repoRoot, baseWorktree, changedTestFiles);
        const baseResult = runTests(baseWorktree, changedTestFiles);
        const headResult = runTests(repoRoot, changedTestFiles);
        const verdict = classifyProof(baseResult, headResult);
        return {
            type: "proof",
            repoRoot,
            baseRef,
            inspection,
            changedTestFiles,
            baseResult,
            headResult,
            verdict,
        };
    }
    finally {
        removeWorktree(repoRoot, baseWorktree);
    }
}
