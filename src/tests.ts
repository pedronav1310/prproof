import { spawnSync } from "node:child_process";
import {copyFileSync, mkdirSync, readFileSync, unlinkSync, existsSync, symlinkSync} from "node:fs";
import {dirname, join} from "node:path";


type VitestReport={
    numTotalTests:number;
    numPassedTests:number;
    numFailedTests:number;
    success:boolean;
}

export type TestStatus= 
    |"passed"
    |"failed"
    |"error"

export type TestRunResult = {
  status: TestStatus;
  output: string;
};

export function linkNodeModules(
  repoRoot: string,
  baseWorktree: string
): void {
  const source = join(repoRoot, "node_modules");
  const destination = join(baseWorktree, "node_modules");

  if (!existsSync(source)) {
    throw new Error("node_modules not found. Run npm install first.");
  }

  symlinkSync(source, destination, "dir");
}

export function getChangedTestFiles(changedFiles: string[]): string[] {
  return changedFiles.filter(
    (file) =>
      file.endsWith(".test.ts") ||
      file.endsWith(".spec.ts") ||
      file.endsWith(".test.tsx") ||
      file.endsWith(".spec.tsx")
  );
}

export function copyTestsToBase(repoRoot: string, baseWorktree: string, testFiles: string[]): void {
  for (const testFile of testFiles) {
    const source = join(repoRoot, testFile);
    const destination = join(baseWorktree, testFile);

    mkdirSync(dirname(destination), {
      recursive: true,
    });

    copyFileSync(source, destination);
  }
}

function runVitest(cwd: string, testFiles: string[] = []): TestRunResult {
    const reportPath = join(cwd, ".pproof-vitest-result.json");
    try{
    const result = spawnSync("npx", ["vitest", "run", ...testFiles, "--reporter=json", `--outputFile=${reportPath}`],
      {
        cwd,
        encoding: "utf8",
      }
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

    if(result.error) {
        return {
            status: "error",
            output,
        };
    }
    if(!existsSync(reportPath)){
        return{
            status:"error",
            output,
        };
    }
    const report = JSON.parse(
        readFileSync(reportPath, "utf8")
    ) as VitestReport;

    if(report.numTotalTests === 0){
    return{
        status:"error",
        output,
    };
}
    if(report.numFailedTests>0){
        return{
            status:"failed",
            output
        };
    }
    if(report.success){
        return{
            status:"passed",
            output,
        };
    }
    return{
        status:"error",
        output,
    };
    }
    finally{
        if(existsSync(reportPath)){
            unlinkSync(reportPath)
        }
    }
}
export function runRegressionTests(cwd: string, testFiles: string[]): TestRunResult {
  return runVitest(cwd, testFiles);
}

export function runFullSuite(cwd: string): TestRunResult {
  return runVitest(cwd);
}