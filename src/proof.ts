import { type TestRunResult } from "./test-runner.js";
export type ProofVerdict =
  | "proven"
  | "unproven"
  | "still-broken"
  | "regression"
  | "error";
export function getExitCode(verdict: ProofVerdict): number {
  if (verdict === "proven") {
    return 0;
  }

  if (verdict === "error") {
    return 2;
  }

  return 1;
}

export function classifyProof(base: TestRunResult, branch: TestRunResult): ProofVerdict {
  if (base.status === "error" || branch.status ==="error"){
    return "error";
  }
  if (base.status === "failed" && branch.status === "passed") {
    return "proven";
  }

  if (base.status === "passed" && branch.status === "passed") {
    return "unproven";
  }

  if (base.status === "failed" && branch.status === "failed") {
    return "still-broken";
  }

  return "regression";
}

export function getVerdictMessage(verdict: ProofVerdict): string {
  switch (verdict) {
    case "error":
      return "❌ ERROR\nPRProof could not reliably execute the regression tests.";

    case "proven":
      return "✅ PROVEN\nThe regression test fails on the base revision and passes on HEAD.";

    case "unproven":
      return "⚠️ UNPROVEN\nThe test also passes before the patch.";

    case "still-broken":
      return "❌ STILL BROKEN\nThe regression test still fails after the patch.";

    case "regression":
      return "❌ POSSIBLE REGRESSION\nThe test passes on the base revision but fails after the patch.";
  }
}