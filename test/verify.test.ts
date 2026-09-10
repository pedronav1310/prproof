import { describe, expect, test } from "vitest";

import {getVerificationReasons, getVerificationReadiness, type VerificationResult,} from "../src/verify.js";

const inspection = {
  productionFiles: ["src/payment.ts"],
  testFiles: ["test/payment.test.ts"],
  otherFiles: [],
  kind: "production-with-tests" as const,
};
test("general verification is ready when the full suite passes", () => {
  const result: VerificationResult = {
    type: "general",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(
    getVerificationReadiness(result)
  ).toBe("ready");
});
test("general verification is not ready when the full suite fails", () => {
  const result: VerificationResult = {
    type: "general",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    headSuiteResult: {
      status: "failed",
      output: "1 test failed",
    },
  };

  expect(
    getVerificationReadiness(result)
  ).toBe("not-ready");
});
test("proven regression is ready when the full suite passes", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: [
      "test/payment.test.ts",
    ],
    baseResult: {
      status: "failed",
      output: "regression reproduced",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "proven",
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(
    getVerificationReadiness(result)
  ).toBe("ready");
});
test("proven regression is not ready when the full suite fails", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: [
      "test/payment.test.ts",
    ],
    baseResult: {
      status: "failed",
      output: "regression reproduced",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "proven",
    headSuiteResult: {
      status: "failed",
      output: "unrelated test failed",
    },
  };

  expect(
    getVerificationReadiness(result)
  ).toBe("not-ready");
});
test("unproven regression is not ready even when the full suite passes", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: [
      "test/payment.test.ts",
    ],
    baseResult: {
      status: "passed",
      output: "",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "unproven",
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(
    getVerificationReadiness(result)
  ).toBe("not-ready");
});
test("returns no reasons for a ready proven regression", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: ["test/payment.test.ts"],
    baseResult: {
      status: "failed",
      output: "",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "proven",
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(getVerificationReasons(result)).toEqual([]);
});
test("returns test-passes-on-base for an unproven regression", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: ["test/payment.test.ts"],
    baseResult: {
      status: "passed",
      output: "",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "unproven",
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(getVerificationReasons(result)).toEqual([
    "test-passes-on-base",
  ]);
}); 
test("returns both proof and suite reasons when both fail", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: ["test/payment.test.ts"],
    baseResult: {
      status: "passed",
      output: "",
    },
    headResult: {
      status: "passed",
      output: "",
    },
    verdict: "unproven",
    headSuiteResult: {
      status: "failed",
      output: "",
    },
  };

  expect(getVerificationReasons(result)).toEqual([
    "test-passes-on-base",
    "head-suite-failed",
  ]);
});
test("returns verification-error when verification cannot run reliably", () => {
  const result: VerificationResult = {
    type: "proof",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    changedTestFiles: ["test/payment.test.ts"],
    baseResult: {
      status: "error",
      output: "",
    },
    headResult: {
      status: "error",
      output: "",
    },
    verdict: "error",
    headSuiteResult: {
      status: "passed",
      output: "",
    },
  };

  expect(getVerificationReasons(result)).toEqual([
    "verification-error",
  ]);
});
test("returns head-suite-failed for failed general verification", () => {
  const result: VerificationResult = {
    type: "general",
    repoRoot: "/repo",
    baseRef: "main",
    inspection,
    headSuiteResult: {
      status: "failed",
      output: "",
    },
  };

  expect(getVerificationReasons(result)).toEqual([
    "head-suite-failed",
  ]);
});