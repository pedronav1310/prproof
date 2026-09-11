import {mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync,} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const PRPROOF_ROOT = resolve(".");
const CLI_PATH = join(PRPROOF_ROOT, "dist", "cli", "cli.js");

const tempRepos: string[] = [];

function writeFile(repo: string, filePath: string, contents: string): void {
  const absolutePath = join(repo, filePath);

  mkdirSync(dirname(absolutePath), {
    recursive: true,
  });

  writeFileSync(absolutePath, contents);
}

function git(repo: string, ...args: string[]): void {
  execFileSync("git", args, {
    cwd: repo,
    stdio: "ignore",
  });
}

function commitAll(repo: string, message: string): void {
  git(repo, "add", ".");
  git(repo, "commit", "-m", message);
}

describe("PRProof CLI regression E2E", () => {
  afterEach(() => {
    for (const repo of tempRepos) {
      rmSync(repo, {
        recursive: true,
        force: true,
      });
    }

    tempRepos.length = 0;
  });

  it("returns PROVEN when the regression test fails on base and passes on HEAD", () => {
    const repo = mkdtempSync(join(tmpdir(), "prproof-e2e-"));
    tempRepos.push(repo);

    git(repo, "init");
    git(repo, "config", "user.email", "prproof@example.com");
    git(repo, "config", "user.name", "PRProof E2E");

    writeFile(repo,
      "package.json",
      JSON.stringify(
        {
          name: "prproof-e2e-fixture",
          private: true,
          type: "module",
          scripts: {
            test: "vitest run",
          },
        },
        null,
        2,
      ),
    );

    writeFile(
      repo,
      ".gitignore",
      "node_modules\n",
    );

    symlinkSync(join(PRPROOF_ROOT, "node_modules"), join(repo, "node_modules"), "dir",);

    writeFile(
      repo,
      "src/discount.ts",
      `
export function applyDiscount(
  price: number,
  discountPercent: number,
): number {
  return price - price * (discountPercent / 100);
}
`,
    );

    writeFile(
      repo,
      "test/discount.test.ts",
      `
import { describe, expect, it } from "vitest";
import { applyDiscount } from "../src/discount.js";

describe("applyDiscount", () => {
  it("applies a positive discount", () => {
    expect(applyDiscount(100, 20)).toBe(80);
  });
});
`,
    );

    commitAll(repo, "base");

    const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim();

    writeFile(
      repo,
      "src/discount.ts",
      `
export function applyDiscount(
  price: number,
  discountPercent: number,
): number {
  if (discountPercent < 0) {
    throw new Error("Discount percentage cannot be negative");
  }

  return price - price * (discountPercent / 100);
}
`,
    );

    writeFile(
      repo,
      "test/discount.test.ts",
      `
import { describe, expect, it } from "vitest";
import { applyDiscount } from "../src/discount.js";

describe("applyDiscount", () => {
  it("applies a positive discount", () => {
    expect(applyDiscount(100, 20)).toBe(80);
  });

  it("rejects negative discounts", () => {
    expect(() => applyDiscount(100, -20)).toThrow(
      "Discount percentage cannot be negative",
    );
  });
});
`,
    );

    commitAll(repo, "fix negative discounts");

    const result = spawnSync(
      process.execPath,
      [
        CLI_PATH,
        repo,
        "--base",
        baseSha,
        "--mode",
        "regression",
        "--json",
      ],
      {
        cwd: PRPROOF_ROOT,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);

    const output = JSON.parse(result.stdout);

    expect(output).toEqual({
      mode: "regression",
      type: "proof",
      readiness: "ready",
      reasons: [],
      verdict: "proven",
      base: "failed",
      head: "passed",
      headSuite: "passed",
    });
  });
});