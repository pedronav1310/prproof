import { spawnSync } from "node:child_process";
import {existsSync, readFileSync, unlinkSync,} from "node:fs";
import { join } from "node:path";

import {type TestRunner, type TestRunResult,} from "./test-runner.js";

type VitestReport = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  success: boolean;
};

export class VitestRunner implements TestRunner {
  runRegressionTests(cwd: string, testFiles: string[]): TestRunResult {
    return this.runVitest(cwd, testFiles);
  }

  runFullSuite(cwd: string): TestRunResult {
    return this.runVitest(cwd);
  }

  private runVitest(cwd: string, testFiles: string[] = []): TestRunResult {
    const reportPath = join(cwd, ".pproof-vitest-result.json");

    try {
      const result = spawnSync(
        "npx",
        [
          "vitest",
          "run",
          ...testFiles,
          "--reporter=json",
          `--outputFile=${reportPath}`,
        ],
        {
          cwd,
          encoding: "utf8",
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

      const report = JSON.parse( readFileSync(reportPath, "utf8") ) as VitestReport;

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