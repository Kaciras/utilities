export default {
	transform: {
		"^.+\\.ts$": ["@swc/jest"],
	},
	extensionsToTreatAsEsm: [".ts"],
	clearMocks: true,
	collectCoverageFrom: [
		"src/**/*.ts",
	],
	coverageDirectory: "coverage",
	coverageProvider: "v8",
	coverageReporters: ["lcov"],
	testMatch: [
		"<rootDir>/test/*.spec.ts",
		"<rootDir>/test/integration/*.ts",
	],
};
