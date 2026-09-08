import { describe, expect, test } from "vitest";
import { getChangedTestFiles } from "../src/tests.js";

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

});