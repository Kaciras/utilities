import { defineSuite } from "esbench";
import { cartesianArray, cartesianObject } from "../src/node.ts";

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

// @ts-ignore https://stackoverflow.com/a/43053803/7065321
const f = (a: any[], b: any[]) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
// @ts-ignore
const SoF_7065321 = (a: any, b: any, ...c: any[]) => (b ? SoF_7065321(f(a, b), ...c) : a);

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

		// @ts-expect-error It works, just not TS compliant.
		// scene.bench("SoF_7065321", () => SoF_7065321(...src));
		scene.bench("array", () => drain(cartesianArray(src)));
		scene.bench("object", () => drain(cartesianObject(oSrc)));
	},
});
