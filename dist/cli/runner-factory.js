import { JestRunner } from "../runners/jest-runner.js";
import { VitestRunner } from "../runners/vitest-runner.js";
import {} from "../runners/test-runner.js";
import {} from "./cli-options.js";
export function createTestRunner(options) {
    if (options.runner === "jest") {
        return new JestRunner({
            config: options.testConfig,
            nodeMemoryMb: options.nodeMemoryMb,
        });
    }
    return new VitestRunner();
}
