import { expect, test } from "tstyche";
import { cartesianArray, cartesianObject } from "../../src/collection.ts";

type CPIterable<T> = Generator<T, void, unknown>;

test("cartesianObject", () => {
	const symbolKey = Symbol();

	expect(cartesianObject({
		[symbolKey]: [33, 44],
		foo: [1, 2],
		bar: [new Array<string>(), "B"],
	})).type.toBe<
		CPIterable<{ foo: 1 | 2; bar: string[] | "B" }>
	>();

	expect(cartesianObject({
		bar: [],
		foo: new Set<1 | 2>(),
	})).type.toBe<
		CPIterable<{ foo: 1 | 2; bar: never }>
	>();

	expect(cartesianObject({})).type.toBe<CPIterable<{}>>();

	expect(cartesianObject([
		["foo", [1, 2]],
		["bar", [new Array<string>(), "B"]],
	])).type.toBe<
		CPIterable<{ foo: 1 | 2; bar: string[] | "B" }>
	>();

	expect(cartesianObject([1, 2, 3])).type.toRaiseError();
	expect(cartesianObject([["1", "2", "3"]])).type.toRaiseError();
	expect(cartesianObject([[1, [2, 3]]])).type.toRaiseError();
	expect(cartesianObject([["1"], ["2"], ["3"]])).type.toRaiseError();
});

test("cartesianArray", () => {
	expect(cartesianArray([[]])).type.toBe<CPIterable<[never]>>();
	expect(cartesianArray([])).type.toBe<CPIterable<never>>();

	expect(cartesianArray([
		[11, 22],
		[new Array<string>(), "B"],
	])).type.toBe<
		CPIterable<[11 | 22, string[] | "B"]>
	>();

	expect(cartesianArray([
		[11, 22],
		new Set<string>(),
	])).type.toBe<
		CPIterable<[11 | 22, string]>
	>();

	expect(cartesianArray(new Array<string[]>)).type.toBe<CPIterable<string[]>>();
});
