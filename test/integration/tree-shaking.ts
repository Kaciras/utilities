import { readFileSync } from "fs";
import { isBuiltin } from "module";
import { join } from "path";
import * as importParser from "es-module-lexer";
import { expect, it } from "@jest/globals";
import { Plugin, rollup } from "rollup";
import { noop } from "../../src/lang.ts";

await importParser.init;

function importOnlyEntry(file: string): Plugin {
	return {
		name: "import-only-entry",
		buildStart() {
			this.emitFile({ type: "chunk", id: "__INPUT__" });
		},
		resolveId(id: string) {
			if (id === "__INPUT__") return id;
		},
		load(id: string) {
			if (id === "__INPUT__") return `import "${file}"`;
		},
	};
}

it.each([
	"./lib/browser.js",
	"./lib/node.js",
])("should export all members as tree-shakable for %s", async file => {
	const bundle = await rollup({
		treeshake: "smallest",
		onwarn: noop,
		external: isBuiltin,
		plugins: [importOnlyEntry(file)],
	});
	expect((await bundle.generate({})).output[0].code).toBe("\n");
});

it("should have no import in browser build", () => {
	const pending = ["./browser.js"];
	const visited = new Set<string>();

	for (const specifier of pending) {
		if (visited.has(specifier)) {
			return;
		}
		visited.add(specifier);

		expect(specifier).toMatch(/^\.\//);
		const code = readFileSync(join("lib", specifier), "utf8");
		const [imports] = importParser.parse(code);
		pending.push(...imports.map(i => i.n!));
	}
});
