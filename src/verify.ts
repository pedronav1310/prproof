import {createBaseWorktree, getChangedFiles, getRepoRoot, removeWorktree,} from "./git.js";

import {copyTestsToBase, getChangedTestFiles, linkNodeModules, runTests, type TestRunResult,} from "./tests.js";

import {classifyProof, type ProofVerdict,} from "./proof.js";

export type VerificationResult = {
  repoRoot: string;
  baseRef: string;
  changedTestFiles: string[];
  baseResult: TestRunResult;
  headResult: TestRunResult;
  verdict: ProofVerdict;
};

export function verifyRepository(targetRepo: string, baseRef: string): VerificationResult | null {
  const repoRoot = getRepoRoot(targetRepo);

  const changedFiles = getChangedFiles(
    targetRepo,
    baseRef
  );

  const changedTestFiles =
    getChangedTestFiles(changedFiles);

  if (changedTestFiles.length === 0) {
    return null;
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

    const baseResult = runTests(
      baseWorktree,
      changedTestFiles
    );

    const headResult = runTests(
      repoRoot,
      changedTestFiles
    );

    const verdict = classifyProof(
      baseResult,
      headResult
    );

    return {
      repoRoot,
      baseRef,
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