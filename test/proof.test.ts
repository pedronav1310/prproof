import { describe, expect, test } from "vitest";
import { classifyProof, getExitCode } from "../src/proof.js";

describe("classifyProof", () => {

  test("failed + passed = proven", () => {
    const result = classifyProof(
      { status: "failed", output: "" },
      { status: "passed", output: "" }
    );

    expect(result).toBe("proven");
  });

  test("passed + passed = unproven", () => {
    const result = classifyProof(
      { status: "passed", output: "" },
      { status: "passed", output: "" }
    );

    expect(result).toBe("unproven");
  });

  test("failed + failed = still-broken", () => {
    const result = classifyProof(
      { status: "failed", output: "" },
      { status: "failed", output: "" }
    );

    expect(result).toBe("still-broken");
  });

  test("passed + failed = regression", () => {
    const result = classifyProof(
      { status: "passed", output: "" },
      { status: "failed", output: "" }
    );

    expect(result).toBe("regression");
  });

  test("an execution error returns error", () => {
    const result = classifyProof(
      { status: "error", output: "" },
      { status: "passed", output: "" }
    );

    expect(result).toBe("error");
  });

});
describe("getExitCode", () => {

  test("proven returns 0", () => {
    expect(getExitCode("proven")).toBe(0);
  });

  test("unproven returns 1", () => {
    expect(getExitCode("unproven")).toBe(1);
  });

  test("still-broken returns 1", () => {
    expect(getExitCode("still-broken")).toBe(1);
  });

  test("regression returns 1", () => {
    expect(getExitCode("regression")).toBe(1);
  });

  test("error returns 2", () => {
    expect(getExitCode("error")).toBe(2);
  });

});