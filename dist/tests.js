import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
export function getChangedTestFiles(changedFiles) {
    return changedFiles.filter((file) => file.endsWith(".test.ts"));
}
export function copyTestsToBase(repoRoot, baseWorktree, testFiles) {
    for (const testFile of testFiles) {
        const source = join(repoRoot, testFile);
        const destination = join(baseWorktree, testFile);
        mkdirSync(dirname(destination), {
            recursive: true,
        });
        copyFileSync(source, destination);
    }
}
export function runTests(cwd, testFiles) {
    const reportPath = join(cwd, ".pproof-vitest-result.json");
    try {
        const result = spawnSync("npx", ["vitest", "run", ...testFiles, "--reporter=json", `--outputFile=${reportPath}`], {
            cwd,
            encoding: "utf8",
        });
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
        const report = JSON.parse(readFileSync(reportPath, "utf8"));
        if (report.numTotalTests === 0) {
            return {
                status: "error",
                output,
            };
        }
        if (report.numFailedTests > 0) {
            return {
                status: "failed",
                output
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
    }
    finally {
        if (existsSync(reportPath)) {
            unlinkSync(reportPath);
        }
    }
}
