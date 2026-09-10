#!/usr/bin/env node

import { verifyRepository } from "../verification/verify.js";

import { resolveCliOptions } from "./cli-options.js";
import { createTestRunner } from "./runner-factory.js";
import {getVerificationExitCode, printVerificationResult,} from "./output.js";

const options = resolveCliOptions();

const testRunner = createTestRunner(options);

const result = verifyRepository(
  options.targetRepo,
  options.baseRef,
  options.mode,
  testRunner,
);

printVerificationResult(result, options);

process.exitCode = getVerificationExitCode(result);