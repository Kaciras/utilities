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
			"kaciras/import-specifier-order": "warn",
			"kaciras/import-node-prefix": "error",

			// The code is highly optimized and does not contain unexpected syntax.
			"no-sequences": "off",
		},
	},
	...jest.map(config => ({ ...config, files: ["test/**/*.ts"] })),
	{
		files: ["test/**/*.tst.ts"],
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-empty-object-type": "off",
		},
	},
];
