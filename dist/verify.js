import { createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree, } from "./git.js";
import { copyTestsToBase, linkNodeModules, runRegressionTests, runFullSuite, } from "./tests.js";
import { inspectChanges, } from "./inspect.js";
import { classifyProof, } from "./proof.js";
const reasonByVerdict = {
    unproven: "test-passes-on-base",
    "still-broken": "regression-still-fails",
    regression: "regression-after-patch",
    error: "verification-error",
};
export function getVerificationReasons(result) {
    if (result.type === "general") {
        if (result.headSuiteResult.status === "passed") {
            return [];
        }
        if (result.headSuiteResult.status === "failed") {
            return ["head-suite-failed"];
        }
        return ["verification-error"];
    }
    if (result.type === "insufficient-evidence") {
        return ["insufficient-evidence"];
    }
    if (result.type === "test-only") {
        return ["test-only"];
    }
    if (result.type === "no-proof-required") {
        return ["no-proof-required"];
    }
    const reasons = [];
    const verdictReason = reasonByVerdict[result.verdict];
    if (verdictReason) {
        reasons.push(verdictReason);
    }
    if (result.headSuiteResult.status === "failed") {
        reasons.push("head-suite-failed");
    }
    if (result.headSuiteResult.status === "error" && !reasons.includes("verification-error")) {
        reasons.push("verification-error");
    }
    return reasons;
}
export function getVerificationReadiness(result) {
    return getVerificationReasons(result).length === 0
        ? "ready"
        : "not-ready";
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
