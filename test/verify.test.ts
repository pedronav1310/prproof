import { describe, expect, test } from "vitest";

import {getVerificationReadiness, type VerificationResult,} from "../src/verify.js";

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