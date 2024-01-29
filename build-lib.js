import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import ts from "typescript";
import { rollup } from "rollup";
import swc from "@swc/core";
import replace from "@rollup/plugin-replace";
import isBuiltinModule from "is-builtin-module";

/**
 * Generate type declaration files. This function does not throw any error
 * if compilation failed, you should check the console for messages.
 *
 * Large file slow down the IDE, so we don't merge declarations.
 *
 * @see https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
function generateTypeDeclaration(entries) {
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
const EXTENSIONS = [".ts", ".js", ".cjs"];

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

async function bundle(input, typeOfWindow) {
	const build = await rollup({
		input,
		external: isBuiltinModule,
		plugins: [
			swcTransform,
			replace({ "typeof window": typeOfWindow }),
		],
	});

	const { output: [chunk] } = await build.write({
		dir: "lib",
		chunkFileNames: "[name].js",
	});

	await build.close();
	console.info(`Generated bundle: lib/${chunk.fileName}`);
}

generateTypeDeclaration(["src/node.ts", "src/browser.ts"]);
await bundle("src/node.ts", "'undefined'");
await bundle("src/browser.ts", "'object'");
