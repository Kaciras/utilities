import { defineSuite } from "esbench";
import { cartesianArray, cartesianObject } from "../src/node.ts";

/*
 * There is a comparison with other libraries:
 * https://esbench.vercel.app/playground?demo=misc%2Fimport-http-module.js
 */

const dataSets = {
	largeProps: [
		...Array.from({ length: 20 }, () => [33]),
		...Array.from({ length: 20 }, () => [44, 55]),
	],
	largeValues: [
		Array.from({ length: 100 }, () => 11),
		Array.from({ length: 100 }, () => 22),
	],
	small: [[11, 22], [33, 44]],
};

function drain(generator: Iterable<unknown>) {
	// noinspection StatementWithEmptyBodyJS
	for (const _ of generator) /* No-op */;
}

export default defineSuite({
	params: {
		input: Object.keys(dataSets) as [keyof typeof dataSets],
	},
	setup(scene) {
		const src = dataSets[scene.params.input];
		const oSrc = src.map((v, i) => [`Key_${i}`, v] as const);

		scene.bench("array", () => drain(cartesianArray(src)));
		scene.bench("object", () => drain(cartesianObject(oSrc)));
	},
});
