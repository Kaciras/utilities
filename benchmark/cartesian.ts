import { defineSuite } from "esbench";
import { cartesianArray, cartesianObject } from "../src/node.ts";

const objectDef = {
	foo: [1.1, 2.2, 3.3, 4.4, 5.5],
	bar: ["abcdefg", "hijklmn"],
	baz: [true, false],
	qux: [1024, 2048, 4096, 8192],
	quux: [{}, [], null, undefined],
};

const arrayDef = [
	[1.1, 2.2, 3.3, 4.4, 5.5],
	["abcdefg", "hijklmn"],
	[true, false],
	[1024, 2048, 4096, 8192],
	[{}, [], null, undefined],
];

// @ts-ignore https://stackoverflow.com/a/43053803/7065321
const f = (a: any[], b: any[]) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
// @ts-ignore
const SoF_7065321 = (a: any, b: any, ...c: any[]) => (b ? SoF_7065321(f(a, b), ...c) : a);

function drain(generator: Iterable<unknown>) {
	// noinspection StatementWithEmptyBodyJS
	for (const _ of generator) /* No-op */;
}

export default defineSuite(scene => {
	// @ts-expect-error It works, just not TS compliant.
	scene.bench("SoF_7065321", () => SoF_7065321(...arrayDef));

	scene.bench("array", () => drain(cartesianArray(arrayDef)));
	scene.bench("object", () => drain(cartesianObject(objectDef)));
});
