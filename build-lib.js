import { dirname, resolve } from "path";
import { readFileSync, rmSync } from "fs";
import { isBuiltin } from "module";
import ts from "typescript";
import { rollup } from "rollup";
import swc from "@swc/core";

/**
 * Generate type declaration files. This function does not throw any error
 * if compilation failed, you should check the console for messages.
 *
 * Large file slow down the IDE, so we don't merge declarations.
 *
 * @see https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
function generateTypeDeclaration(...entries) {
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
swcrc.swcrc = false;

const swcTransform = {
	name: "swc-transform-sync",

	resolveId(id, importer) {
		if (id.startsWith("\0")) {
			return null;
		}
		return importer
			? resolve(dirname(importer), id)
			: resolve(id);
	},

	transform(code, id) {
		swcrc.filename = id;
		return swc.transformSync(code, swcrc);
	},
};

async function bundle(...input) {
	const build = await rollup({
		input,
		treeshake: "smallest",
		external: isBuiltin,
		plugins: [swcTransform],
	});

	await build.write({
		minifyInternalExports: false,
		dir: "lib",
		chunkFileNames: "[name].js",
	});

	await build.close();
	console.info(`Generated bundle of ${input.length} entries`);
}

// Equivalent to `if __name__ == "__main__":` in Python.
if (process.argv[1] === import.meta.filename) {
	rmSync("lib", { recursive: true, force: true });
	bundle("src/node.ts", "src/browser.ts");
	generateTypeDeclaration("src/node.ts", "src/browser.ts");
}
