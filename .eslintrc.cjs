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
	overrides: [{
		files: [
			"test/**/*.ts",
		],
		extends: ["@kaciras/jest"],
	}],
};
