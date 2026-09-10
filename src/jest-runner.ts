import { spawnSync } from "node:child_process";
import {existsSync, readFileSync, unlinkSync,} from "node:fs";
import { join } from "node:path";
import {type TestRunner, type TestRunResult,} from "./test-runner.js";

type JestAssertionResult = {
  status: string;
};

type JestTestResult = {
  testExecError?: {
    message?: string;
  };
  assertionResults?: JestAssertionResult[];
};

type JestReport = {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults?: JestTestResult[];
};

export type JestRunnerOptions = {
  config?: string;
  nodeMemoryMb?: number;
};

export class JestRunner implements TestRunner {
  constructor(private readonly options: JestRunnerOptions = {}) {}

  runRegressionTests(cwd: string, testFiles: string[]): TestRunResult {
    return this.runJest(cwd, testFiles);
  }

  runFullSuite(cwd: string): TestRunResult {
    return this.runJest(cwd);
  }

  private runJest(cwd: string, testFiles: string[] = []): TestRunResult {
    const reportPath = join(cwd, ".pproof-jest-result.json");

    const args = [
      "jest",
      ...testFiles,
      "--runInBand",
      "--json",
      `--outputFile=${reportPath}`,
    ];

    if (this.options.config) {
      args.push(`--config=${this.options.config}`);
    }

    try {
      const nodeOptions = this.options.nodeMemoryMb ? `--max-old-space-size=${this.options.nodeMemoryMb}` : process.env.NODE_OPTIONS;
      const result = spawnSync(
        "npx",
        args,
        {
          cwd,
          encoding: "utf8",
          env:{
            ...process.env,
            ...(nodeOptions ? {NODE_OPTIONS: nodeOptions} : {}),
          }
        }
      );

      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

      if (result.error) {
        return {
          status: "error",
          output,
        };
      }

      if (!existsSync(reportPath)) {
        return {
          status: "error",
          output,
        };
      }

      let report: JestReport;

      try {
        report = JSON.parse(readFileSync(reportPath, "utf8")) as JestReport;
      } catch {
        return {
          status: "error",
          output,
        };
      }

      const hasExecutionError = report.testResults?.some((testResult) =>
            testResult.testExecError !== undefined
        ) ?? false;

      if (hasExecutionError) {
        return {
          status: "error",
          output,
        };
      }

      if (report.numTotalTests === 0) {
        return {
          status: "error",
          output,
        };
      }

      if (report.numFailedTests > 0) {
        return {
          status: "failed",
          output,
        };
      }

      if (report.success) {
        return {
          status: "passed",
          output,
        };
      }

      return {
        status: "error",
        output,
      };
    } finally {
      if (existsSync(reportPath)) {
        unlinkSync(reportPath);
      }
    }
  }
}