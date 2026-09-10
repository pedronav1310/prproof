# PRProof Agent Verification Protocol

PRProof is designed to act as a verification gate for agent-written bug fixes.

The coding agent should not consider a bug fix complete only because the new test passes on the patched code.

For regression fixes, the agent must produce executable evidence that the new regression test distinguishes the broken base revision from the patched revision.

## Verification loop

For bug fixes, the coding agent should follow this process:

1. Inspect the issue and repository.

2. Implement the smallest focused fix.

3. Add a regression test that covers the reported bug.

4. Commit the current attempt.

5. Run PRProof in regression mode:

   ```bash
   prproof . --base main --mode regression --json
   ```

6. Inspect the PRProof result.

7. The change is ready only when:

   - `readiness` is `ready`
   - `verdict` is `proven`
   - the regression test fails on the base revision
   - the same regression test passes on HEAD
   - the full test suite passes on HEAD

8. If `readiness` is `not-ready`, inspect the reported `reasons`.

9. Repair the patch, the regression test, or both depending on the reported reasons.

10. Commit the new attempt and run PRProof again.

11. Repeat until PRProof reports:

   ```json
   {
     "readiness": "ready",
     "reasons": [],
     "verdict": "proven"
   }
   ```

12. Only after successful verification should the agent push the branch or open a pull request.

## Expected verification behavior

A successfully proven regression fix should produce this behavior:

```text
base revision + new regression test
→ FAIL

patched HEAD + same regression test
→ PASS

full test suite on patched HEAD
→ PASS
```

This results in:

```text
PROVEN
READY
```

## Reasons a change may not be ready

PRProof may report one or more reasons when a change is not ready.

### `test-passes-on-base` — Test passes on the base revision
The new regression test also passes on the base revision.

This means the test does not demonstrate the behavioral difference introduced by the patch.

The agent should strengthen or correct the regression test.

Expected behavior:

```text
base: PASS
HEAD: PASS
→ UNPROVEN
```

### `regression-still-fails` — Test fails on both revisions

The regression test fails on both the base revision and HEAD.

The test reproduces a failure, but the patch has not fixed it.

The agent should repair the implementation.

Expected behavior:

```text
base: FAIL
HEAD: FAIL
→ STILL BROKEN
```

### `regression-after-patch` — Test regresses on HEAD

The regression test passes on the base revision but fails on HEAD.

The patch introduced behavior that causes the test to regress.

The agent should inspect the implementation and test assumptions.

Expected behavior:

```text
base: PASS
HEAD: FAIL
→ REGRESSION
```

### `head-suite-failed` — Full test suite fails on HEAD

The regression evidence may be valid, but one or more tests in the full HEAD test suite are failing.

The change must not be considered ready until the complete suite passes.

For example:

```text
base regression test: FAIL
HEAD regression test: PASS
HEAD full suite: FAIL

proof: PROVEN
readiness: NOT READY
```

The agent should investigate the failing suite before continuing.

### `verification-error` — Verification execution error

PRProof could not reliably execute the verification.

Examples include:

- test runner failures
- invalid test configuration
- module resolution failures
- tests that could not be executed
- malformed or missing test reports

An execution error must never be treated as a regression failure.

The agent should first repair the test environment or execution problem.

### `insufficient-evidence` — Missing regression test

Production code changed, but no regression test was provided.

For regression mode, the agent must add a test that exercises the reported bug.

### `test-only` — Only test files changed

Only test files changed.

No production fix was detected.

For a bug-fix workflow, the agent should confirm whether a production change is actually required.

### `no-proof-required` — No changes requiring counterfactual verification

PRProof did not detect production or regression-test changes that require counterfactual verification.

This does not represent a proven bug fix.

## Example results

### Successful regression verification

A successful regression verification may look like:

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

### Unproven regression test

An unproven test may look like:

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

### Proven regression with a failing full suite

A regression may be proven while the overall change is still not ready:

```json
{
  "mode": "regression",
  "type": "proof",
  "readiness": "not-ready",
  "reasons": [
    "head-suite-failed"
  ],
  "verdict": "proven",
  "base": "failed",
  "head": "passed",
  "headSuite": "failed"
}
```

## General mode

Not every pull request represents a regression fix.

For feature work, refactors, and other changes where a fail-before/pass-after test is not appropriate, PRProof can run in general mode:

```bash
prproof . --base main --mode general --json
```

General mode does not require counterfactual regression evidence.

It verifies that the full test suite passes on HEAD.

## Scope and limitations

For a successful regression verification, PRProof proves that:

- the new regression test fails against the selected base revision
- the same test passes against the patched revision
- the full test suite passes on the patched revision

This provides executable evidence that the regression test distinguishes the old behavior from the new behavior.

PRProof does not prove that:

- the implementation is globally correct
- the issue specification was interpreted perfectly
- the regression test completely represents the intended behavior
- no untested bugs remain
- the patch is the best possible implementation

A patch and test could theoretically agree on incorrect behavior and still satisfy counterfactual verification.

PRProof is therefore a verification gate, not a replacement for all forms of review.

Its purpose is to prevent an agent from declaring a bug fix complete without first producing reproducible regression evidence.

## Completion condition

For regression fixes, the agent should treat the following as the completion condition:

```text
PRProof readiness = ready
AND
PRProof verdict = proven
AND
PRProof reasons = []
```

Until those conditions are satisfied, the agent should continue iterating on the same bug fix.
