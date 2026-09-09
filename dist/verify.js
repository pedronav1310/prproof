import { createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree, } from "./git.js";
import { copyTestsToBase, getChangedTestFiles, linkNodeModules, runTests, } from "./tests.js";
import { classifyProof, } from "./proof.js";
export function verifyRepository(targetRepo, baseRef) {
    const repoRoot = getRepoRoot(targetRepo);
    const changedFiles = getChangedFiles(targetRepo, baseRef);
    const changedTestFiles = getChangedTestFiles(changedFiles);
    if (changedTestFiles.length === 0) {
        return null;
    }
    const baseWorktree = createBaseWorktree(repoRoot, baseRef);
    try {
        linkNodeModules(repoRoot, baseWorktree);
        copyTestsToBase(repoRoot, baseWorktree, changedTestFiles);
        const baseResult = runTests(baseWorktree, changedTestFiles);
        const headResult = runTests(repoRoot, changedTestFiles);
        const verdict = classifyProof(baseResult, headResult);
        return {
            repoRoot,
            baseRef,
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
