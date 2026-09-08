#!/usr/bin/env node
import { createBaseWorktree, getChangedFiles, getCurrentBranch, getRepoRoot, removeWorktree, } from "./git.js";
import { copyTestsToBase, getChangedTestFiles, runTests, } from "./tests.js";
import { classifyProof, getVerdictMessage, } from "./proof.js";
const targetRepo = process.argv[2] ?? process.cwd();
const repoRoot = getRepoRoot(targetRepo);
const currentBranch = getCurrentBranch(targetRepo);
const changedFiles = getChangedFiles(targetRepo);
const changedTestFiles = getChangedTestFiles(changedFiles);
if (changedTestFiles.length === 0) {
    console.log("No changed regression tests found.");
    process.exit(0);
}
console.log("PRProof");
console.log(`Repository: ${repoRoot}`);
console.log(`Current branch: ${currentBranch}`);
console.log(`Changed tests: ${changedTestFiles.join(", ")}`);
const baseWorktree = createBaseWorktree(repoRoot);
try {
    copyTestsToBase(repoRoot, baseWorktree, changedTestFiles);
    const baseResult = runTests(baseWorktree, changedTestFiles);
    const branchResult = runTests(repoRoot, changedTestFiles);
    const verdict = classifyProof(baseResult, branchResult);
    console.log();
    console.log(`main: ${baseResult.status}`);
    console.log(`${currentBranch}: ${branchResult.status}`);
    console.log();
    console.log(getVerdictMessage(verdict));
}
finally {
    removeWorktree(repoRoot, baseWorktree);
}
