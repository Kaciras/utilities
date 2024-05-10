// noinspection JSVoidFunctionReturnValueUsed

import { expect, test } from "tstyche";
import { asyncNoop, Awaitable, ItemOfIterable, noop } from "../../src/lang.ts";

test("Awaitable", () => {
	expect<Awaitable<number>>().type.toEqual<number | PromiseLike<number>>();

	expect<Awaitable<number>>().type.toBeAssignable(11);
	expect<Awaitable<number>>().type.toBeAssignable(Promise.resolve(11));
});

test("noop should accept arguments", () => {
	expect(noop()).type.toEqual<void>();
	expect(noop(11, 22, 33)).type.toEqual<void>();
});

test("asyncNoop should accept arguments", () => {
	expect(asyncNoop()).type.toEqual<Promise<void>>();
	expect(asyncNoop(11, 22, 33)).type.toEqual<Promise<void>>();
});

test("ItemOfIterable", () => {
	function* generate() { yield 11 as const; }

	const apply = <T>(v: T) => v as ItemOfIterable<T>;
	expect(apply(generate())).type.toEqual<11>();

	expect<ItemOfIterable<Set<11>>>().type.toEqual<11>();
	expect<ItemOfIterable<Array<11>>>().type.toEqual<11>();
});
