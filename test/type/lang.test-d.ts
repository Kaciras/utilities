/* eslint-disable @typescript-eslint/ban-types */

import { expectAssignable, expectType } from "tsd-lite";
import { describe } from "@jest/globals";
import { Awaitable, cartesianProductArray, cartesianProductObj } from "../../src/lang.js";

describe("Awaitable", () => {
	expectAssignable<Awaitable<number>>(11);
	expectAssignable<Awaitable<number>>(Promise.resolve(11));
});

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
