import {createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree,} from "./git.js";

import {copyTestsToBase, linkNodeModules, runRegressionTests, runFullSuite, type TestRunResult,} from "./tests.js";

import {inspectChanges, type PrInspection,} from "./inspect.js";

import {classifyProof, type ProofVerdict,} from "./proof.js";

export type VerificationMode =
  | "regression"
  | "general";
  
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

export function verifyRepository(targetRepo: string, baseRef: string, mode:VerificationMode): VerificationResult{
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
  const headSuiteResult = runFullSuite(repoRoot);

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

    const baseResult = runRegressionTests(
      baseWorktree,
      changedTestFiles
    );

    const headResult = runRegressionTests(
      repoRoot,
      changedTestFiles
    );

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
      verdict,
    };
  } finally {
    removeWorktree(
      repoRoot,
      baseWorktree
    );
  }
}