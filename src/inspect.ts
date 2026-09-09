export type PrChangeKind =
  | "production-with-tests"
  | "production-without-tests"
  | "test-only"
  | "other-only";

export type PrInspection = {
  productionFiles: string[];
  testFiles: string[];
  otherFiles: string[];
  kind: PrChangeKind;
};

function isTestFile(file: string): boolean {
  return (file.endsWith(".test.ts") || file.endsWith(".spec.ts"));
}

function isProductionFile(file: string): boolean {
  return (file.endsWith(".ts") && !isTestFile(file));
}

export function inspectChanges(changedFiles: string[]): PrInspection {
  const testFiles = changedFiles.filter(isTestFile);

  const productionFiles = changedFiles.filter(isProductionFile);

  const otherFiles = changedFiles.filter(
    (file) =>
      !isTestFile(file) &&
      !isProductionFile(file)
  );

  let kind: PrChangeKind;

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