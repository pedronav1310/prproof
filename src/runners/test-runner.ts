export type TestStatus =
  | "passed"
  | "failed"
  | "error";

export type TestRunResult = {
status: TestStatus;
  output: string;
};

export interface TestRunner {
  runRegressionTests(cwd: string, testFiles: string[]): TestRunResult;
  runFullSuite(cwd: string): TestRunResult;
}