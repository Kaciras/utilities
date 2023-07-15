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
	coverageReporters: ["lcovonly"],
	testMatch: [
		"<rootDir>/test/*.spec.ts",
		"<rootDir>/test/integration/*.ts",
	],
	//
	// https://github.com/kulshekhar/ts-jest/issues/1057
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	moduleFileExtensions: ["ts", "js", "json"],
};
