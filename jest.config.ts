import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    ".+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["js", "ts"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverage: true,
  coverageReporters: ["text", "lcov"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts"],
  coverageProvider: "v8",
  clearMocks: true,
  testTimeout: 10000,
  setupFiles: ["<rootDir>/tests/util/envVariables.ts"],
  globalSetup: "<rootDir>/tests/util/testSetup.ts",
};

export default config;
