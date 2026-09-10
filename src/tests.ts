import {copyFileSync, existsSync, mkdirSync, symlinkSync,} from "node:fs";
import { dirname, join } from "node:path";

export function linkNodeModules(repoRoot: string, baseWorktree: string): void {
  const source = join(repoRoot, "node_modules");
  const destination = join(baseWorktree, "node_modules");

  if (!existsSync(source)) {
    throw new Error(
      "node_modules not found. Run npm install first."
    );
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