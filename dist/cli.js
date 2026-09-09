#!/usr/bin/env node
import { verifyRepository, } from "./verify.js";
import { getVerdictMessage, getExitCode, } from "./proof.js";
import { parseArgs } from "node:util";
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
    },
    allowPositionals: true,
});
const mode = values.mode;
const targetRepo = positionals[0] ?? process.cwd();
const baseRef = values.base;
if (mode !== "general" && mode !== "regression") {
    console.error(`Invalid mode: ${mode}. Expected "general" or "regression".`);
    process.exit(2);
}
const result = verifyRepository(targetRepo, baseRef, mode);
console.log("PRProof");
console.log(`Repository: ${result.repoRoot}`);
if (result.type === "general") {
    console.log("GENERAL VERIFICATION");
    console.log();
    console.log(`HEAD suite: ${result.headSuiteResult.status}`);
    console.log();
    if (result.headSuiteResult.status === "passed") {
        console.log("✅ General verification passed.");
        process.exitCode = 0;
    }
    else if (result.headSuiteResult.status === "failed") {
        console.log("❌ General verification failed.");
        process.exitCode = 1;
    }
    else {
        console.log("❌ ERROR");
        console.log("PRProof could not reliably execute the full test suite.");
        process.exitCode = 2;
    }
}
else if (result.type === "insufficient-evidence") {
    console.log("❌ INSUFFICIENT EVIDENCE");
    console.log("Production code changed but no regression test was added.");
    process.exitCode = 1;
}
else if (result.type === "test-only") {
    console.log("ℹ️ TEST-ONLY CHANGE");
    console.log("No production code changed. Regression proof is not required.");
    process.exitCode = 0;
}
else if (result.type === "no-proof-required") {
    console.log("ℹ️ NO REGRESSION EVIDENCE REQUIRED");
    console.log("No production or regression-test changes were detected.");
    process.exitCode = 0;
}
else {
    console.log(`Changed tests: ${result.changedTestFiles.join(", ")}`);
    console.log();
    console.log(`${result.baseRef}: ${result.baseResult.status}`);
    console.log(`HEAD: ${result.headResult.status}`);
    console.log();
    console.log(getVerdictMessage(result.verdict));
    process.exitCode =
        getExitCode(result.verdict);
}
