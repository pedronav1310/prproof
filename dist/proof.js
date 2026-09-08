export function classifyProof(base, branch) {
    if (base.status === "error" || branch.status === "error") {
        return "error";
    }
    if (base.status === "failed" && branch.status === "passed") {
        return "proven";
    }
    if (base.status === "passed" && branch.status === "passed") {
        return "unproven";
    }
    if (base.status === "failed" && branch.status === "failed") {
        return "still-broken";
    }
    return "regression";
}
export function getVerdictMessage(verdict) {
    switch (verdict) {
        case "error":
            return "❌ ERROR\nPRProof could not reliably execute the regression tests.";
        case "proven":
            return "✅ PROVEN\nThe regression test fails before the patch and passes after it.";
        case "unproven":
            return "⚠️ UNPROVEN\nThe test also passes before the patch.";
        case "still-broken":
            return "❌ STILL BROKEN\nThe regression test still fails after the patch.";
        case "regression":
            return "❌ POSSIBLE REGRESSION\nThe test passes on main but fails after the patch.";
    }
}
