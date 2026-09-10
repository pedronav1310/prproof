import { describe, expect, test } from "vitest";
import { getChangedTestFiles } from "../src/test-support/tests.js";

describe("getChangedTestFiles", () => {

  test("returns changed TypeScript test files", () => {
    const changedFiles = [
      "src/discount.ts",
      "test/discount.test.ts",
      "README.md",
    ];

    const result = getChangedTestFiles(changedFiles);

    expect(result).toEqual([
      "test/discount.test.ts"
    ]);
  });

  test("returns multiple changed test files", () => {
    const changedFiles = [
      "test/discount.test.ts",
      "src/cart.ts",
      "test/cart.test.ts",
    ];

    const result = getChangedTestFiles(changedFiles);

    expect(result).toEqual([
      "test/discount.test.ts",
      "test/cart.test.ts",
    ]);
  });

  test("returns an empty array when there are no tests", () => {
    const changedFiles = [
      "src/discount.ts",
      "README.md",
    ];

    const result = getChangedTestFiles(changedFiles);

    expect(result).toEqual([]);
  });
  
  test("returns changed spec files", () => {
    const changedFiles = [
      "src/math.ts",
      "test/math.spec.ts",
  ];

    const result = getChangedTestFiles(changedFiles);

    expect(result).toEqual(["test/math.spec.ts"]);
  });

  test("recognizes tsx test files", () => {
    const result = getChangedTestFiles([
      "src/Button.tsx",
      "src/Button.test.tsx",
      "src/Button.spec.tsx",
      "README.md",
    ]);

    expect(result).toEqual([
      "src/Button.test.tsx",
      "src/Button.spec.tsx",
    ]);
  });

});