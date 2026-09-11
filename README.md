# PRProof

**Fail before. Pass after. Keep the suite green.**

PRProof is a verification gate for agent-written pull requests.

It checks whether a regression test actually distinguishes the base revision from the patched `HEAD` before the change is handed to a human reviewer.

English · [Español (planned)](README.es.md)

## Why PRProof exists

A test that passes after a patch is useful, but it is not proof that the test would have caught the reported bug.

This matters especially for agent-written pull requests. An agent can produce:

- a plausible patch;
- a plausible regression test;
- a green test suite;

and still fail to prove that the reported bug was actually fixed.

PRProof checks the counterfactual:

> Would this same regression test have failed before the patch?

For a valid regression fix, PRProof expects:

```text
BASE + regression test -> FAIL
HEAD + regression test -> PASS
HEAD full suite        -> PASS
```

If that happens, the regression evidence is `PROVEN`.

PRProof does **not** prove that the entire patch is correct, that the issue specification is correct, or that every relevant behavior is covered. It proves a narrower claim: the regression test distinguishes the old behavior from the patched behavior in the expected direction.

## Agent workflow

PRProof is designed to sit between an agent-written patch and human review.

```text
Issue
  |
  v
Agent writes fix
  |
  v
Agent adds regression test
  |
  v
Agent runs PRProof
  |
  v
PROVEN?
  |---- no ----> keep iterating
  |
 yes
  |
  v
HEAD suite green?
  |---- no ----> keep iterating
  |
 yes
  |
  v
Open or update PR
  |
  v
Human review
```

The goal is simple:

> The agent may write the patch and the test, but it should not consider the change review-ready until the evidence passes.

### Example agent instruction

You can give an agent an instruction like:

```text
Fix the reported bug and add a regression test.

Before marking the task complete, run PRProof in regression mode.

Do not consider the task ready unless:
- verdict = proven
- readiness = ready
- reasons = []

If PRProof returns unproven, still-broken, regression, or error,
keep iterating until verification passes.
```

The agent can then run:

```bash
prproof . --base main --mode regression --json
```

If PRProof is not installed as a command yet, the equivalent source-based command is:

```bash
node dist/cli/cli.js . --base main --mode regression --json
```

## How PRProof works

In `regression` mode, PRProof:

1. Compares the selected base revision against `HEAD`.
2. Identifies changed TypeScript production and test files.
3. Creates a temporary Git worktree at the base revision.
4. Links the target repository's `node_modules` into that worktree.
5. Copies the changed test files from `HEAD` into the base worktree.
6. Runs those regression tests against the base revision.
7. Runs the same regression tests against `HEAD`.
8. Runs the full test suite against `HEAD`.
9. Classifies the evidence.
10. Removes the temporary worktree.

```text
changed regression test + base revision -> expected to fail
changed regression test + patched HEAD  -> expected to pass
full test suite + patched HEAD           -> expected to pass
```

The regression verdict and the full-suite result are separate.

A regression test can be `PROVEN` while the overall verification is still not ready because the full `HEAD` suite failed.

## Regression verdicts

| Base test | HEAD test | Verdict | Meaning |
| --- | --- | --- | --- |
| Fail | Pass | `PROVEN` | The regression test distinguishes the base revision from `HEAD`. |
| Pass | Pass | `UNPROVEN` | The test also passes before the patch, so it does not prove the fix. |
| Fail | Fail | `STILL BROKEN` | The test reproduces a failure, but the patch does not make it pass. |
| Pass | Fail | `REGRESSION` | The behavior passed on the base revision and fails on `HEAD`. |
| Error | Any | `ERROR` | PRProof could not reliably execute the regression test on the base revision. |
| Any | Error | `ERROR` | PRProof could not reliably execute the regression test on `HEAD`. |

Regression verification is ready only when:

```text
verdict = proven
AND readiness = ready
AND reasons = []
```

and the full test suite passes on `HEAD`.

## Quick start

PRProof is currently run from source.

Assume you have:

```text
~/projects/prproof
~/projects/my-app
```

Build PRProof:

```bash
cd ~/projects/prproof
npm ci
npm run build
```

Install dependencies in the repository you want to verify:

```bash
cd ~/projects/my-app
npm install
```

Make and commit your bug fix and regression test.

Then run PRProof:

```bash
cd ~/projects/prproof

node dist/cli/cli.js ../my-app \
  --base main \
  --mode regression
```

For a valid regression fix, the expected result is:

```text
BASE + regression test -> FAIL
HEAD + regression test -> PASS
HEAD full suite        -> PASS

=> PROVEN
=> READY
```

### Optional local command

During development, you can expose the `prproof` command locally with:

```bash
cd ~/projects/prproof
npm link
```

Then from another repository:

```bash
cd ~/projects/my-app

prproof . \
  --base main \
  --mode regression
```

## Verification modes

### Regression mode

Use `regression` mode for bug fixes where a regression test should prove the behavioral difference between the old code and the patch.

```bash
prproof . --base main --mode regression
```

Core expectation:

```text
BASE FAIL + HEAD PASS -> PROVEN
```

### General mode

Use `general` mode for changes where counterfactual regression evidence is not required, such as some features, refactors, or maintenance work.

General mode runs the full test suite on `HEAD`.

```bash
prproof . --base main --mode general
```

## CLI usage

```text
prproof [target-repository] [options]
```

Source-based equivalent:

```text
node dist/cli/cli.js [target-repository] [options]
```

If `target-repository` is omitted, PRProof uses the current working directory.

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `--base <ref>` | Any locally available Git ref | `main` | Selects the base revision used for comparison. |
| `--mode <mode>` | `general`, `regression` | `general` | Selects general verification or counterfactual regression verification. |
| `--runner <runner>` | `vitest`, `jest` | Config value, then `vitest` | Selects the test runner. |
| `--testConfig <path>` | Path | Config value | Passes a Jest config file to Jest. |
| `--nodeMemoryMb <mb>` | Positive integer | Config value | Sets the Node.js memory limit for supported runner execution. |
| `--json` | Boolean flag | `false` | Prints machine-readable JSON output. |

## Configuration

PRProof can read persistent repository configuration from:

```text
prproof.config.json
```

Example:

```json
{
  "runner": "jest",
  "testConfig": "packages/example/jest.config.mjs",
  "nodeMemoryMb": 8192
}
```

Configuration precedence is:

```text
CLI flag > prproof.config.json > default
```

`base`, `mode`, and `json` remain CLI-oriented options.

## Supported test runners

PRProof currently supports:

- Vitest
- Jest

Select Vitest with:

```bash
--runner vitest
```

Select Jest with:

```bash
--runner jest
```

For Jest repositories, you can also provide a config path:

```bash
--testConfig packages/example/jest.config.mjs
```

## JSON output

Use `--json` for machine-readable output.

Example `PROVEN` result:

```json
{
  "mode": "regression",
  "type": "proof",
  "readiness": "ready",
  "reasons": [],
  "verdict": "proven",
  "base": "failed",
  "head": "passed",
  "headSuite": "passed"
}
```

Example `UNPROVEN` result:

```json
{
  "mode": "regression",
  "type": "proof",
  "readiness": "not-ready",
  "reasons": [
    "test-passes-on-base"
  ],
  "verdict": "unproven",
  "base": "passed",
  "head": "passed",
  "headSuite": "passed"
}
```

This makes PRProof suitable for agent and CI workflows.

## Exit codes

| Exit code | Meaning |
| --- | --- |
| `0` | Verification passed or no blocking regression evidence is required. |
| `1` | Verification completed, but the change is not ready. |
| `2` | PRProof could not reliably execute verification. |

Examples:

```text
PROVEN + green full suite -> 0
UNPROVEN                  -> 1
STILL BROKEN              -> 1
REGRESSION                -> 1
execution/config error    -> 2
```

## GitHub Actions

PRProof can also act as a pull-request check.

A typical agent + CI workflow is:

```text
Issue
  |
  v
Agent creates fix + regression test
  |
  v
Agent opens or updates PR
  |
  v
PRProof runs
  |
  +--> not proven -> agent keeps iterating
  |
  v
PROVEN + suite green
  |
  v
Human review
```

This keeps weak agent-generated pull requests out of the human review queue without requiring the PR itself to be delayed.

The current PRProof repository already runs PRProof as a GitHub Actions check on pull requests.

## Manual usage

PRProof is useful without an agent too.

For example, if you are fixing a bug manually:

```bash
prproof . --base main --mode regression
```

PRProof will verify whether your new regression test:

- fails against the base revision;
- passes against `HEAD`;
- and leaves the full `HEAD` suite green.

## What PRProof does not prove

PRProof intentionally makes a narrow claim.

It does **not** prove:

- that the entire patch is globally correct;
- that the issue description or specification is correct;
- that the regression test covers every relevant edge case;
- that unrelated behavior was not missed by the existing suite;
- that a wrong patch paired with a matching wrong test is semantically correct.

A wrong patch and a matching wrong test can still produce `PROVEN`.

PRProof proves only that the selected regression test behaves differently before and after the patch in the expected direction.

## Current scope

PRProof currently focuses on:

- TypeScript repositories;
- Vitest and Jest;
- Git-based base/HEAD comparison;
- changed regression test verification;
- full-suite verification on `HEAD`;
- JSON output for automation;
- GitHub Actions integration.

Broader execution models such as generalized monorepo commands and custom test commands are outside the current core scope.

## Development

Install dependencies:

```bash
npm ci
```

Build:

```bash
npm run build
```

Type-check test code:

```bash
npm run typecheck:test
```

Run the full test suite:

```bash
npm test
```

Run a specific E2E test:

```bash
npx vitest run test/e2e/cli-regression.test.ts
```

The E2E suite covers the main counterfactual outcomes:

```text
BASE FAIL + HEAD PASS -> PROVEN
BASE PASS + HEAD PASS -> UNPROVEN
BASE FAIL + HEAD FAIL -> STILL BROKEN
BASE PASS + HEAD FAIL -> REGRESSION
execution/runtime failure -> ERROR
```

## Project status

PRProof is under active development.

The current core focuses on one question:

> Does the regression test actually prove that the behavior changed from broken on the base revision to passing on the patch?
