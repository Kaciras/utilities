import { expect, it } from "@jest/globals";
import isBuiltin from "is-builtin-module";
import { Plugin, rollup } from "rollup";

function importOnlyEntry(file: string): Plugin {
	return {
		name: "import-only-entry",
		buildStart() {
			this.emitFile({ type: "chunk", id: "__IMPORT_ENTRY__" });
		},
		resolveId(id: string) {
			if (id === "__IMPORT_ENTRY__") return id;
		},
		load(id: string) {
			if (id === "__IMPORT_ENTRY__") return `import "${file}"`;
		},
	};
}

const resolveBuiltinModule: Plugin = {
	name: "node-builtin",
	resolveId(id: string) {
		if (isBuiltin(id)) return {
			id,
			external: true,
			moduleSideEffects: false,
		};
	},
};

it.each([
	"./dist/browser.js",
	"./dist/node.js",
])("should export all members as tree-shakable for %s", async file => {
	const bundle = await rollup({
		plugins: [resolveBuiltinModule, importOnlyEntry(file)],
	});
	expect((await bundle.generate({})).output[0].code).toBe("\n");
});
