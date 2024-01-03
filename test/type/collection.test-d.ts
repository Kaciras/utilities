/* eslint-disable @typescript-eslint/ban-types */
import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { cartesianArray, cartesianObject } from "../../src/collection.ts";

describe("cartesianObject", () => {
	const symbolKey = Symbol();

	expectType<Iterable<{
		foo: 1 | 2;
		bar: string[] | "B";
	}>>(cartesianObject({
		[symbolKey]: [33, 44],
		foo: [1, 2],
		bar: [new Array<string>(), "B"],
	}));

	expectType<Iterable<{
		foo: 1 | 2;
		bar: never;
	}>>(cartesianObject({
		bar: [],
		foo: new Set<1 | 2>(),
	}));

	expectType<Iterable<{}>>(cartesianObject({}));

	expectType<Iterable<{
		foo: 1 | 2;
		bar: "A" | "B";
	}>>(cartesianObject([
		["foo", [1, 2]],
		["bar", ["A", "B"]],
	]));

	// @ts-expect-error
	cartesianObject([1, 2, 3]);
	// @ts-expect-error
	cartesianObject([["1", "2", "3"]]);
	// @ts-expect-error
	cartesianObject([[1, [2, 3]]]);
	// @ts-expect-error
	cartesianObject([["1"], ["2"], ["3"]]);
});

describe("cartesianArray", () => {
	expectType<Iterable<never>>(cartesianArray([]));

	expectType<Iterable<[never]>>(cartesianArray([[]]));

	expectType<Iterable<[
			1 | 2,
			string[] | "B",
	]>>(cartesianArray([
		[1, 2],
		[new Array<string>(), "B"],
	]));

	expectType<Iterable<string[]>>(cartesianArray(new Array<string[]>));
});
