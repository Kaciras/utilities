import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { rollup } from "rollup";
import swc from "@swc/core";
import replace from "@rollup/plugin-replace";
import isBuiltin from "is-builtin-module";

// Can not use import-assertion because the filename has no extension.
const swcrc = JSON.parse(readFileSync(".swcrc", "utf8"));

const JS_RE = /\.[mc]?[jt]sx?$/;
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ".cjs", ".jsx"];

const swcTransform = {
	name: "swc-transform-sync",

	resolveId(id, importer) {
		if (id.startsWith("\0")) {
			return null;
		}
		const path = importer
			? resolve(dirname(importer), id)
			: resolve(id);

		const stem = path.replace(JS_RE, "");
		return EXTENSIONS
			.map(ext => `${stem}${ext}`)
			.find(existsSync);
	},

	transform(code, id) {
		swcrc.filename = id;
		return swc.transformSync(code, swcrc);
	},
};

// Tells Rollup that Node builtin modules are side-effect free.
const resolveBuiltinModule = {
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
			resolveBuiltinModule,
			swcTransform,
			replace({ 
				"typeof window": typeOfWindow,
			}),
		],
	});

	await bundle.write({
		dir: "dist",
		chunkFileNames: "[name].js",
	});
}

await buildPlatform("lib/node.ts", "'undefined'");
await buildPlatform("lib/browser.ts", "'object'");
