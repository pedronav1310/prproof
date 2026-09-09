#!/usr/bin/env node

import {verifyRepository,} from "./verify.js";

import {getVerdictMessage, getExitCode,} from "./proof.js";

import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: {
    base: {
      type: "string",
      default: "main",
    },
  },
  allowPositionals: true,
});

const targetRepo = positionals[0] ?? process.cwd();
const baseRef = values.base;

const result = verifyRepository(
  targetRepo,
  baseRef
);

if (result === null) {
  console.log(
    "No changed regression tests found."
  );

  process.exit(0);
}

console.log("PRProof");

console.log(
  `Repository: ${result.repoRoot}`
);

if(result.type==="insufficient-evidence"){
  console.log("❌ INSUFFICIENT EVIDENCE");
  console.log("Production code changed but no regression test was added");
  
  process.exitCode = 1;
}

else {
  console.log(`Changed tests: ${result.changedTestFiles.join(", ")}`);
  console.log();
  console.log(`${result.baseRef}: ${result.baseResult.status}`);

  console.log(`HEAD: ${result.headResult.status}`);
  console.log();

  console.log(getVerdictMessage(result.verdict));

  process.exitCode = getExitCode(result.verdict);
}