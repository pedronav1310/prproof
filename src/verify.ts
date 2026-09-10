import {createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree,} from "./git.js";

import {copyTestsToBase, linkNodeModules} from "./tests.js";

import { type TestRunResult, type TestRunner, } from "./test-runner.js";

import { VitestRunner , } from "./vitest-runner.js";

import {inspectChanges, type PrInspection,} from "./inspect.js";

import {classifyProof, type ProofVerdict,} from "./proof.js";


export type VerificationMode =
  | "regression"
  | "general";

export type VerificationReadiness =
  | "ready"
  | "not-ready";

export type VerificationReason =
  | "test-passes-on-base"
  | "regression-still-fails"
  | "regression-after-patch"
  | "verification-error"
  | "head-suite-failed"
  | "insufficient-evidence"
  | "test-only"
  | "no-proof-required";

export type GeneralVerificationResult = {
  type: "general";
  repoRoot: string;
  baseRef: string;
  inspection: PrInspection;
  headSuiteResult: TestRunResult;
};

export type TestOnlyResult = {
  type: "test-only";
  repoRoot: string;
  baseRef: string;
  inspection: PrInspection;
};

export type NoProofRequiredResult = {
  type: "no-proof-required";
  repoRoot: string;
  baseRef: string;
  inspection: PrInspection;
};

export type ProofVerificationResult = {
  type: "proof";
  repoRoot: string;
  baseRef: string;
  inspection: PrInspection;
  changedTestFiles: string[];
  baseResult: TestRunResult;
  headResult: TestRunResult;
  headSuiteResult: TestRunResult;
  verdict: ProofVerdict;
};

export type InsufficientEvidenceResult = {
  type: "insufficient-evidence";
  repoRoot: string;
  baseRef: string;
  inspection: PrInspection;
};

export type VerificationResult =
  | ProofVerificationResult
  | InsufficientEvidenceResult
  | TestOnlyResult
  | NoProofRequiredResult
  | GeneralVerificationResult;

const reasonByVerdict: Partial<Record<ProofVerdict, VerificationReason>> = {
  unproven: "test-passes-on-base",
  "still-broken": "regression-still-fails",
  regression: "regression-after-patch",
  error: "verification-error",
};

export function getVerificationReasons(result: VerificationResult): VerificationReason[] {
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

  const reasons: VerificationReason[] = [];

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

export function getVerificationReadiness(result: VerificationResult): VerificationReadiness {
  return getVerificationReasons(result).length === 0
    ? "ready"
    : "not-ready";
}

export function verifyRepository(targetRepo: string, baseRef: string, mode:VerificationMode, testRunner: TestRunner = new VitestRunner()): VerificationResult{
  const repoRoot = getRepoRoot(targetRepo);

  const changedFiles = getChangedFiles(targetRepo, baseRef);

  const inspection = inspectChanges(changedFiles);

  const changedTestFiles = inspection.testFiles;

  if (inspection.kind==="other-only"){
    return{
        type: "no-proof-required",
        repoRoot,
        baseRef,
        inspection,
    };
  }

  if (mode === "general") {
  const headSuiteResult = testRunner.runFullSuite(repoRoot);

  return {
    type: "general",
    repoRoot,
    baseRef,
    inspection,
    headSuiteResult,
    };
  }

  if (inspection.kind==="production-without-tests"){
    return{
        type:"insufficient-evidence",
        repoRoot,
        baseRef,
        inspection
    };
  }

  if (inspection.kind==="test-only"){
    return{
        type:"test-only",
        repoRoot,
        baseRef,
        inspection,
    };
  }



  const baseWorktree = createBaseWorktree(
    repoRoot,
    baseRef
  );

  try {
    linkNodeModules(
      repoRoot,
      baseWorktree
    );

    copyTestsToBase(
      repoRoot,
      baseWorktree,
      changedTestFiles
    );

    const baseResult = testRunner.runRegressionTests(
      baseWorktree,
      changedTestFiles
    );

    const headResult = testRunner.runRegressionTests(
      repoRoot,
      changedTestFiles
    );

    const headSuiteResult = testRunner.runFullSuite(repoRoot);

    const verdict = classifyProof(
      baseResult,
      headResult
    );

    return {
      type:"proof",
      repoRoot,
      baseRef,
      inspection,
      changedTestFiles,
      baseResult,
      headResult,
      headSuiteResult,
      verdict,
    };
  } finally {
    removeWorktree(
      repoRoot,
      baseWorktree
    );
  }
}