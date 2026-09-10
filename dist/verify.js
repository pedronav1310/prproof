import { createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree, } from "./git.js";
import { copyTestsToBase, linkNodeModules, runRegressionTests, runFullSuite, } from "./tests.js";
import { inspectChanges, } from "./inspect.js";
import { classifyProof, } from "./proof.js";
export function getVerificationReadiness(result) {
    if (result.type === "general") {
        return result.headSuiteResult.status === "passed"
            ? "ready"
            : "not-ready";
    }
    if (result.type === "proof") {
        return (result.verdict === "proven" &&
            result.headSuiteResult.status === "passed")
            ? "ready"
            : "not-ready";
    }
    return "not-ready";
}
export function verifyRepository(targetRepo, baseRef, mode) {
    const repoRoot = getRepoRoot(targetRepo);
    const changedFiles = getChangedFiles(targetRepo, baseRef);
    const inspection = inspectChanges(changedFiles);
    const changedTestFiles = inspection.testFiles;
    if (inspection.kind === "other-only") {
        return {
            type: "no-proof-required",
            repoRoot,
            baseRef,
            inspection,
        };
    }
    if (mode === "general") {
        const headSuiteResult = runFullSuite(repoRoot);
        return {
            type: "general",
            repoRoot,
            baseRef,
            inspection,
            headSuiteResult,
        };
    }
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
    const baseWorktree = createBaseWorktree(repoRoot, baseRef);
    try {
        linkNodeModules(repoRoot, baseWorktree);
        copyTestsToBase(repoRoot, baseWorktree, changedTestFiles);
        const baseResult = runRegressionTests(baseWorktree, changedTestFiles);
        const headResult = runRegressionTests(repoRoot, changedTestFiles);
        const headSuiteResult = runFullSuite(repoRoot);
        const verdict = classifyProof(baseResult, headResult);
        return {
            type: "proof",
            repoRoot,
            baseRef,
            inspection,
            changedTestFiles,
            baseResult,
            headResult,
            headSuiteResult,
            verdict,
        };
    }
    finally {
        removeWorktree(repoRoot, baseWorktree);
    }
}
