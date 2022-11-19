import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { rollup } from "rollup";
import swc from "@swc/core";
import replace from "@rollup/plugin-replace";
import isBuiltin from "is-builtin-module";

// noinspection JSCheckFunctionSignatures `JSON.parse` support Buffer.
const swcrc = JSON.parse(readFileSync(".swcrc"));

const JS_RE = /\.[mc]?[jt]sx?$/;
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ".cjs", ".jsx"];

const swcTransform = {
	name: "swc-transform",

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

	async transform(code, id) {
		swcrc.filename = id;
		return swc.transformSync(code, swcrc);
	},
};

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
			replace({ "typeof window": typeOfWindow }),
		],
	});

	await bundle.write({
		format: "esm",
		dir: "dist",
		chunkFileNames: "[name].js",
	});
}

await buildPlatform("lib/node.ts", "'undefined'");
await buildPlatform("lib/browser.ts", "'object'");
