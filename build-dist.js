import { rollup } from "rollup";
import swc from "@swc/core";
import replace from "@rollup/plugin-replace";
import isBuiltin from "is-builtin-module";

const swcTransform = {
	name: "swc-transform",
	async transform(code, id) {
		return swc.transformSync(code, {
			"jsc": {
				"parser": {
					"syntax": "typescript",
				},
				"target": "es2022",
			},
		});
	},
};

const builtin = {
	name: "node-builtin",
	resolveId(id) {
		if (isBuiltin(id)) return {
			id,
			external: true,
			moduleSideEffects: false,
		};
	},
};

async function buildPlatform(input, typeOfWindow) {
	const bundle = await rollup({
		input,
		plugins: [
			swcTransform,
			builtin,
			replace({ "typeof window": typeOfWindow }),
		],
	});

	await bundle.write({
		generatedCode: "es2015",
		format: "esm",
		dir: "dist",
		chunkFileNames: "[name].js",
	});
}

await buildPlatform("lib/node.ts", "'undefined'");
await buildPlatform("lib/browser.ts", "'object'");
