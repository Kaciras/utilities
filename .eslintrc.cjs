module.exports = {
	root: true,
	extends: [
		"@kaciras/core",
		"@kaciras/typescript",
	],
	env: {
		browser: true,
		node: true,
	},
	rules: {
		"@kaciras/import-group-sort": "warn",
	},
	overrides: [{
		files: [
			"test/**/*.ts",
		],
		extends: ["@kaciras/jest"],
	}],
};
