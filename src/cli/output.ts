import {getVerificationReadiness, getVerificationReasons, type VerificationResult,} from "../verification/verify.js";
import { getVerdictMessage } from "../verification/proof.js";
import { type ResolvedCliOptions } from "./cli-options.js";

export function getVerificationExitCode(result: VerificationResult,): number {
  if (result.type === "general") {
    if (result.headSuiteResult.status === "passed") {
      return 0;
    }

    if (result.headSuiteResult.status === "error") {
      return 2;
    }

    return 1;
  }

  if (result.type === "insufficient-evidence") {
    return 1;
  }

  if (result.type === "test-only" || result.type === "no-proof-required") {
    return 0;
  }

  if (result.verdict === "error" || result.headSuiteResult.status === "error") {
    return 2;
  }

  if (result.verdict === "proven" && result.headSuiteResult.status === "passed") {
    return 0;
  }

  return 1;
}

function toJsonResult(result: VerificationResult, mode: "general" | "regression",) {
  const readiness = getVerificationReadiness(result);
  const reasons = getVerificationReasons(result);

  if (result.type === "general") {
    return {
      mode,
      type: result.type,
      readiness,
      reasons,
      headSuite: result.headSuiteResult.status,
    };
  }

  if (result.type === "proof") {
    return {
      mode,
      type: result.type,
      readiness,
      reasons,
      verdict: result.verdict,
      base: result.baseResult.status,
      head: result.headResult.status,
      headSuite: result.headSuiteResult.status,
    };
  }

  return {
    mode,
    type: result.type,
    readiness,
    reasons,
  };
}

export function printVerificationResult(result: VerificationResult, options: ResolvedCliOptions,): void {
  if (options.json) {
    console.log(JSON.stringify(toJsonResult(result, options.mode), null, 2,),);
    return;
  }

  console.log("PRProof");
  console.log(`Repository: ${result.repoRoot}`);

  if (result.type === "general") {
    console.log("GENERAL VERIFICATION");
    console.log();
    console.log(`HEAD suite: ${result.headSuiteResult.status}`);
    console.log();

    if (result.headSuiteResult.status === "passed") {
      console.log("✅ General verification passed.");
    } 
    else if (result.headSuiteResult.status === "failed") {
      console.log("❌ General verification failed.");
    } 
    else {
      console.log("❌ ERROR");
      console.log("PRProof could not reliably execute the full test suite.",);
    }

    return;
  }

  if (result.type === "insufficient-evidence") {
    console.log("❌ INSUFFICIENT EVIDENCE");
    console.log("Production code changed but no regression test was added.",);

    return;
  }

  if (result.type === "test-only") {
    console.log("ℹ️ TEST-ONLY CHANGE");
    console.log("No production code changed. Regression proof is not required.",);

    return;
  }

  if (result.type === "no-proof-required") {
    console.log("ℹ️ NO REGRESSION EVIDENCE REQUIRED");
    console.log("No production or regression-test changes were detected.",);

    return;
  }

  console.log(`Changed tests: ${result.changedTestFiles.join(", ")}`,);

  console.log();
  console.log(`${result.baseRef}: ${result.baseResult.status}`);
  console.log(`HEAD: ${result.headResult.status}`);
  console.log(`HEAD suite: ${result.headSuiteResult.status}`);
  console.log();

  console.log(getVerdictMessage(result.verdict));
}