import {describe, expect,test,} from "vitest";

import {
  inspectChanges,
} from "../src/inspect.js";

describe("inspectChanges", () => {
  test("classifies production files with tests", () => {
    const result = inspectChanges([
      "src/payment.ts",
      "test/payment.test.ts",
    ]);

    expect(result.kind).toBe(
      "production-with-tests"
    );

    expect(result.productionFiles).toEqual([
      "src/payment.ts",
    ]);

    expect(result.testFiles).toEqual([
      "test/payment.test.ts",
    ]);
  });

  test("classifies production files without tests", () => {
    const result = inspectChanges([
      "src/payment.ts",
    ]);

    expect(result.kind).toBe(
      "production-without-tests"
    );
  });

  test("classifies test-only changes", () => {
    const result = inspectChanges([
      "test/payment.test.ts",
    ]);

    expect(result.kind).toBe(
      "test-only"
    );
  });

  test("classifies non-TypeScript changes as other-only", () => {
    const result = inspectChanges([
      "README.md",
      ".github/workflows/ci.yaml",
    ]);

    expect(result.kind).toBe(
      "other-only"
    );

    expect(result.otherFiles).toEqual([
      "README.md",
      ".github/workflows/ci.yaml",
    ]);
  });

  test("recognizes spec files as tests", () => {
    const result = inspectChanges([
      "src/payment.ts",
      "test/payment.spec.ts",
    ]);

    expect(result.kind).toBe(
      "production-with-tests"
    );

    expect(result.testFiles).toEqual([
      "test/payment.spec.ts",
    ]);
  });
});