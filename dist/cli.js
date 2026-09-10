#!/usr/bin/env node
import { getVerificationReasons, getVerificationReadiness, verifyRepository, } from "./verify.js";
import { getVerdictMessage, } from "./proof.js";
import { parseArgs } from "node:util";
import { JestRunner } from "./jest-runner.js";
import { VitestRunner } from "./vitest-runner.js";
import {} from "./test-runner.js";
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
            default: "vitest",
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
const mode = values.mode;
const targetRepo = positionals[0] ?? process.cwd();
const baseRef = values.base;
const runner = values.runner;
const nodeMemoryMb = values.nodeMemoryMb ? Number(values.nodeMemoryMb) : undefined;
if (mode !== "general" && mode !== "regression") {
    console.error(`Invalid mode: ${mode}. Expected "general" or "regression".`);
    process.exit(2);
}
if (runner !== "vitest" && runner !== "jest") {
    console.error(`Invalid runner: ${runner}. Expected "vitest" or "jest".`);
    process.exit(2);
}
if (nodeMemoryMb !== undefined && (!Number.isInteger(nodeMemoryMb) || nodeMemoryMb <= 0)) {
    console.error(`Invalid nodeMemoryMb: ${values.nodeMemoryMb}. Expected a positive integer.`);
    process.exit(2);
}
let testRunner;
if (runner == "jest") {
    testRunner = new JestRunner({ config: values.testConfig, nodeMemoryMb, });
}
else {
    testRunner = new VitestRunner();
}
function getVerificationExitCode(result) {
    if (result.type === "general") {
        if (result.headSuiteResult.status === "passed") {
            return 0;
        }
        if (result.headSuiteResult.status === "error") {
            return 2;
        }
        return 1;
    }
    if (result.type === "insufficient-evidence") {
        return 1;
    }
    if (result.type === "test-only" || result.type === "no-proof-required") {
        return 0;
    }
    if (result.verdict === "error" || result.headSuiteResult.status === "error") {
        return 2;
    }
    if (result.verdict === "proven" && result.headSuiteResult.status === "passed") {
        return 0;
    }
    return 1;
}
function toJsonResult(result, mode) {
    const readiness = getVerificationReadiness(result);
    const reasons = getVerificationReasons(result);
    if (result.type === "general") {
        return {
            mode,
            type: result.type,
            readiness,
            reasons,
            headSuite: result.headSuiteResult.status,
        };
    }
    if (result.type === "proof") {
        return {
            mode,
            type: result.type,
            readiness,
            reasons,
            verdict: result.verdict,
            base: result.baseResult.status,
            head: result.headResult.status,
            headSuite: result.headSuiteResult.status,
        };
    }
    return {
        mode,
        type: result.type,
        readiness,
        reasons,
    };
}
const result = verifyRepository(targetRepo, baseRef, mode, testRunner);
process.exitCode = getVerificationExitCode(result);
if (values.json) {
    console.log(JSON.stringify(toJsonResult(result, mode), null, 2));
}
else {
    console.log("PRProof");
    console.log(`Repository: ${result.repoRoot}`);
    if (result.type === "general") {
        console.log("GENERAL VERIFICATION");
        console.log();
        console.log(`HEAD suite: ${result.headSuiteResult.status}`);
        console.log();
        if (result.headSuiteResult.status === "passed") {
            console.log("✅ General verification passed.");
        }
        else if (result.headSuiteResult.status === "failed") {
            console.log("❌ General verification failed.");
        }
        else {
            console.log("❌ ERROR");
            console.log("PRProof could not reliably execute the full test suite.");
        }
    }
    else if (result.type === "insufficient-evidence") {
        console.log("❌ INSUFFICIENT EVIDENCE");
        console.log("Production code changed but no regression test was added.");
    }
    else if (result.type === "test-only") {
        console.log("ℹ️ TEST-ONLY CHANGE");
        console.log("No production code changed. Regression proof is not required.");
    }
    else if (result.type === "no-proof-required") {
        console.log("ℹ️ NO REGRESSION EVIDENCE REQUIRED");
        console.log("No production or regression-test changes were detected.");
    }
    else {
        console.log(`Changed tests: ${result.changedTestFiles.join(", ")}`);
        console.log();
        console.log(`${result.baseRef}: ${result.baseResult.status}`);
        console.log(`HEAD: ${result.headResult.status}`);
        console.log(`HEAD suite: ${result.headSuiteResult.status}`);
        console.log();
        console.log(getVerdictMessage(result.verdict));
    }
}
