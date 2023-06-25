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
	testMatch: [
		"<rootDir>/test/*.spec.ts",
		"<rootDir>/test/integration/*.ts",
	],
};
