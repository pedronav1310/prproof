import { JestRunner } from "../runners/jest-runner.js";
import { VitestRunner } from "../runners/vitest-runner.js";
import { type TestRunner } from "../runners/test-runner.js";

import { type ResolvedCliOptions } from "./cli-options.js";

export function createTestRunner(options: ResolvedCliOptions,): TestRunner {
  if (options.runner === "jest") {
    return new JestRunner({
      config: options.testConfig,
      nodeMemoryMb: options.nodeMemoryMb,
    });
  }

  return new VitestRunner();
}