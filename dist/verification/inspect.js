function isTestFile(file) {
    return (file.endsWith(".test.ts") ||
        file.endsWith(".spec.ts") ||
        file.endsWith(".test.tsx") ||
        file.endsWith(".spec.tsx"));
}
function isProductionFile(file) {
    return ((file.endsWith(".ts") || file.endsWith(".tsx")) && !isTestFile(file));
}
export function inspectChanges(changedFiles) {
    const testFiles = changedFiles.filter(isTestFile);
    const productionFiles = changedFiles.filter(isProductionFile);
    const otherFiles = changedFiles.filter((file) => !isTestFile(file) &&
        !isProductionFile(file));
    let kind;
    if (productionFiles.length > 0 && testFiles.length > 0) {
        kind = "production-with-tests";
    }
    else if (productionFiles.length > 0) {
        kind = "production-without-tests";
    }
    else if (testFiles.length > 0) {
        kind = "test-only";
    }
    else {
        kind = "other-only";
    }
    return {
        productionFiles,
        testFiles,
        otherFiles,
        kind,
    };
}
