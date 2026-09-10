import fs from "node:fs";
import path from "node:path";
const CONFIG_FILE_NAME = "prproof.config.json";
function validatePrProofConfig(config) {
    if (config.runner !== undefined && config.runner !== "vitest" && config.runner !== "jest") {
        throw new Error(`Invalid runner "${config.runner}". Expected "vitest" or "jest".`);
    }
    if (config.nodeMemoryMb !== undefined && (!Number.isInteger(config.nodeMemoryMb) || config.nodeMemoryMb <= 0)) {
        throw new Error("nodeMemoryMb must be a positive integer.");
    }
}
export function loadPrProofConfig(repoRoot) {
    const configPath = path.join(repoRoot, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
        return {};
    }
    const contents = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(contents);
    validatePrProofConfig(config);
    return config;
}
