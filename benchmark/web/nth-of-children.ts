import { defineSuite } from "esbench";
import { nthInChildren } from "../../src/dom.ts";

for (let i = 0; i < 1000; i++) {
	document.body.append(document.createElement("div"));
}

export function byIndexOf(el: Node) {
	return Array.prototype.indexOf.call(el.parentNode!.children, el);
}

export default defineSuite({
	baseline: { type: "Name", value: "children" },
	setup(scene) {
		const v = document.body.children[64];
		scene.bench("children", () => nthInChildren(v));
		scene.bench("sibling", () => byIndexOf(v));
	},
});
