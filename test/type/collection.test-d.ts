/* eslint-disable @typescript-eslint/ban-types */
import { expect, test } from "tstyche";
import { cartesianArray, cartesianObject } from "../../src/collection.ts";

test("cartesianObject", () => {
	const symbolKey = Symbol();

	expect(cartesianObject({
		[symbolKey]: [33, 44],
		foo: [1, 2],
		bar: [new Array<string>(), "B"],
	})).type.toEqual<
		Iterable<{ foo: 1 | 2; bar: string[] | "B" }>
	>();

	expect(cartesianObject({
		bar: [],
		foo: new Set<1 | 2>(),
	})).type.toEqual<
		Iterable<{ foo: 1 | 2; bar: never }>
	>();

	expect(cartesianObject({})).type.toEqual<Iterable<{}>>();

	expect(cartesianObject([
		["foo", [1, 2]],
		["bar", [new Array<string>(), "B"]],
	])).type.toEqual<
		Iterable<{ foo: 1 | 2; bar: string[] | "B" }>
	>();

	expect(cartesianObject([1, 2, 3])).type.toRaiseError();
	expect(cartesianObject([["1", "2", "3"]])).type.toRaiseError();
	expect(cartesianObject([[1, [2, 3]]])).type.toRaiseError();
	expect(cartesianObject([["1"], ["2"], ["3"]])).type.toRaiseError();
});

test("cartesianArray", () => {
	expect(cartesianArray([])).type.toEqual<Iterable<never>>();
	expect(cartesianArray([[]])).type.toEqual<Iterable<[never]>>();

	expect(cartesianObject([
		["foo", [1, 2]],
		["bar", [new Array<string>(), "B"]],
	])).type.toEqual<
		Iterable<{ foo: 1 | 2; bar: string[] | "B" }>
	>();

	expect(cartesianArray([
		[1, 2],
		[new Array<string>(), "B"],
	])).type.toEqual<
		Iterable<[1 | 2, string[] | "B"]>
	>();

	expect(cartesianArray(new Array<string[]>)).type.toEqual<Iterable<string[]>>();
});
