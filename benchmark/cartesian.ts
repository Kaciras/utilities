import { defineSuite } from "esbench";
import { cartesianArray, cartesianObject } from "../src/node.ts";

const objectDef = {
	foo: [11, 22, 33, 44, 55],
	bar: ["abcdefg", "hijklmn"],
	baz: [true, false],
	qux: [1024, 2048, 4096, 8192],
};

const arrayDef = [
	[11, 22, 33, 44, 55],
	["abcdefg", "hijklmn"],
	[true, false],
	[1024, 2048, 4096, 8192],
];

function drain(generator: Iterable<unknown>) {
	// noinspection StatementWithEmptyBodyJS
	for (const _ of generator) /* No-op */;
}

export default defineSuite(scene => {
	scene.bench("array", () => drain(cartesianArray(arrayDef)));
	scene.bench("object", () => drain(cartesianObject(objectDef)));
});