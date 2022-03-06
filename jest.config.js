export default {
	transform: {
		"^.+\\.ts$": ["@swc/jest"],
	},
	extensionsToTreatAsEsm: [".ts"],
	clearMocks: true,
	collectCoverageFrom: [
		"lib/**/*.ts",
	],
	coverageDirectory: "coverage",
	coverageProvider: "v8",
	testMatch: [
		"<rootDir>/test/**/*.spec.ts",
	],
	moduleFileExtensions: ["ts", "js", "json", "node"],
};
