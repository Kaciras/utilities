import { readFileSync } from "fs";
import { parse as parseImports } from "es-module-lexer";
import { expect, it } from "@jest/globals";
import { Plugin, rollup } from "rollup";
import isBuiltinModule from "is-builtin-module";
import { noop } from "../../src/lang.ts";

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

const resolveBuiltinModule: Plugin = {
	name: "node-builtin",
	resolveId(id: string) {
		if (isBuiltinModule(id)) return {
			id,
			external: true,
			moduleSideEffects: false,
		};
	},
};

it.each([
	"./lib/browser.js",
	"./lib/node.js",
])("should export all members as tree-shakable for %s", async file => {
	const bundle = await rollup({
		onwarn: noop,
		plugins: [resolveBuiltinModule, importOnlyEntry(file)],
	});
	expect((await bundle.generate({})).output[0].code).toBe("\n");
});

it("should have no import in browser build", () => {
	expect(parseImports(readFileSync("./lib/browser.js", "utf8"))[0]).toHaveLength(0);
});
