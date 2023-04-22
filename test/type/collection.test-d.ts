/* eslint-disable @typescript-eslint/ban-types */
import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { cartesianProductArray, cartesianProductObj } from "../../src/collection.js";

describe("cartesianProductObj", () => {
	expectType<Iterable<{
		foo: 1 | 2;
		bar: string[] | "B";
	}>>(cartesianProductObj({
		foo: [1, 2],
		bar: [new Array<string>(), "B"],
	}));

	expectType<Iterable<{
		foo: 1 | 2;
		bar: never;
	}>>(cartesianProductObj({
		bar: [],
		foo: new Set<1 | 2>(),
	}));

	expectType<Iterable<{}>>(cartesianProductObj({}));
});

describe("cartesianProductArray", () => {
	expectType<Iterable<never>>(cartesianProductArray([]));

	expectType<Iterable<[never]>>(cartesianProductArray([[]]));

	expectType<Iterable<[
			1 | 2,
			string[] | "B",
	]>>(cartesianProductArray([
		[1, 2],
		[new Array<string>(), "B"],
	]));

	expectType<Iterable<string[]>>(
		cartesianProductArray(new Array<string[]>),
	);
});
