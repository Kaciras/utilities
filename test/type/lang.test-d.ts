import { expectAssignable, expectType } from "tsd-lite";
import { describe } from "@jest/globals";
import { Awaitable, ItemOfIterable } from "../../src/lang.js";

describe("Awaitable", () => {
	expectAssignable<Awaitable<number>>(11);
	expectAssignable<Awaitable<number>>(Promise.resolve(11));
});

describe("ItemOfIterable", () => {
	function* generate() { yield 11 as const; }

	const apply = <T>(v: T) => v as ItemOfIterable<T>;
	expectType<11>(apply(generate()));

	expectType<11>(22 as ItemOfIterable<Set<11>>);
	expectType<11>(22 as ItemOfIterable<Array<11>>);
});
