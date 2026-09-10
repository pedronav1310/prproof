import { parseArgs } from "node:util";
import { loadPrProofConfig } from "../config/config.js";
import { getRepoRoot } from "../git/git.js";

export type VerificationMode = "general" | "regression";
export type RunnerName = "vitest" | "jest";

export type ResolvedCliOptions = {
  targetRepo: string;
  baseRef: string;
  mode: VerificationMode;
  runner: RunnerName;
  testConfig?: string;
  nodeMemoryMb?: number;
  json: boolean;
};

export function resolveCliOptions(): ResolvedCliOptions {
  const { values, positionals } = parseArgs({
    options: {
      base: {
        type: "string",
        default: "main",
      },
      mode: {
        type: "string",
        default: "general",
      },
      json: {
        type: "boolean",
        default: false,
      },
      runner: {
        type: "string",
      },
      testConfig: {
        type: "string",
      },
      nodeMemoryMb: {
        type: "string",
      },
    },
    allowPositionals: true,
  });

  const targetRepo = positionals[0] ?? process.cwd();
  const repoRoot = getRepoRoot(targetRepo);

  let config;

  try {
    config = loadPrProofConfig(repoRoot);
  } 
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`Invalid PRProof config: ${message}`);
    process.exit(2);
  }

  const mode = values.mode;
  const runner = values.runner ?? config.runner ?? "vitest";

  const testConfig = values.testConfig ?? config.testConfig;

  const nodeMemoryMb = values.nodeMemoryMb !== undefined ? Number(values.nodeMemoryMb) : config.nodeMemoryMb;

  if (mode !== "general" && mode !== "regression") {
    console.error(`Invalid mode: ${mode}. Expected "general" or "regression".`,);

    process.exit(2);
  }

  if (runner !== "vitest" && runner !== "jest") {
    console.error(`Invalid runner: ${runner}. Expected "vitest" or "jest".`,);

    process.exit(2);
  }

  if (nodeMemoryMb !== undefined && (!Number.isInteger(nodeMemoryMb) || nodeMemoryMb <= 0)) {
    console.error(`Invalid nodeMemoryMb: ${values.nodeMemoryMb ?? config.nodeMemoryMb}. Expected a positive integer.`,);

    process.exit(2);
  }

  return {
    targetRepo,
    baseRef: values.base,
    mode,
    runner,
    testConfig,
    nodeMemoryMb,
    json: values.json,
  };
}