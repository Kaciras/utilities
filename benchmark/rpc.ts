import { defineSuite } from "esbench";
import { RPC } from "../src/node.ts";

const deep5 = { foo: { bar: [{ baz: [() => 114514] }] } };
const deep1 = { foo: () => 114514 };

export default defineSuite({
	validate: { check: value => value === 114514 },
	params: {
		deep: [1, 5],
	},
	setup(scene) {
		if (scene.params.deep === 1) {
			const client = RPC.createClient(msg => RPC.serve(deep1, msg));
			scene.benchAsync("Direct", () => deep1.foo());
			scene.benchAsync("RPC", () => client.foo());
		} else {
			const client = RPC.createClient(msg => RPC.serve(deep5, msg));
			scene.benchAsync("Direct", () => deep5.foo.bar[0].baz[0]());
			scene.benchAsync("RPC", () => client.foo.bar[0].baz[0]());
		}
	},
});
