import core from "@kaciras/eslint-config-core";
import typescript from "@kaciras/eslint-config-typescript";
import jest from "@kaciras/eslint-config-jest";

export default [
	{
		ignores: ["lib/**", "coverage/**", "playwright-report/**"],
	},
	...core,
	...typescript,
	{
		rules: {
			"kaciras/import-group-sort": "warn",
		},
	},
	...jest.map(config => ({ ...config, files: ["test/**/*.ts"] })),
];
