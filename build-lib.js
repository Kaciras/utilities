import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import ts from "typescript";
import { rollup } from "rollup";
import swc from "@swc/core";
import replace from "@rollup/plugin-replace";
import isBuiltin from "is-builtin-module";

/**
 * Generate type declaration files. This function does not throw any error
 * if compilation failed, you should check the console for messages.
 *
 * @see https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
function compileTypeScript(entries) {
	const { config } = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
	const { options } = ts.convertCompilerOptionsFromJson(config.compilerOptions, ".");

	const program = ts.createProgram(entries, options);
	const emitResult = program.emit();

	let diagnostics = ts
		.getPreEmitDiagnostics(program)
		.concat(emitResult.diagnostics);

	for (const { file, start, messageText } of diagnostics) {
		const message = ts.flattenDiagnosticMessageText(messageText, "\n");
		if (!file) {
			console.error(message);
		} else {
			let { line, character } = ts.getLineAndCharacterOfPosition(file, start);
			console.error(`${file.fileName} (${line + 1},${character + 1}): ${message}`);
		}
	}
}

// Cannot use import-assertion because the filename has no extension.
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
		dir: "lib",
		chunkFileNames: "[name].js",
	});
}

compileTypeScript(["src/node.ts", "src/browser.ts"]);
await buildPlatform("src/node.ts", "'undefined'");
await buildPlatform("src/browser.ts", "'object'");
