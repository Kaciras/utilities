// noinspection JSVoidFunctionReturnValueUsed

import { expect, test } from "tstyche";
import { asyncNoop, Awaitable, ItemOfIterable, noop } from "../../src/lang.ts";

test("Awaitable", () => {
	expect<Awaitable<number>>().type.toBe<number | PromiseLike<number>>();

	expect<Awaitable<number>>().type.toBeAssignableWith(11);
	expect<Awaitable<number>>().type.toBeAssignableWith(Promise.resolve(11));
});

test("noop should accept arguments", () => {
	expect(noop()).type.toBe<void>();
	expect(noop(11, 22, 33)).type.toBe<void>();
});

test("asyncNoop should accept arguments", () => {
	expect(asyncNoop()).type.toBe<Promise<void>>();
	expect(asyncNoop(11, 22, 33)).type.toBe<Promise<void>>();
});

test("ItemOfIterable", () => {
	function* generate() { yield 11 as const; }

	const apply = <T>(v: T) => v as ItemOfIterable<T>;
	expect(apply(generate())).type.toBe<11>();

	expect<ItemOfIterable<Set<11>>>().type.toBe<11>();
	expect<ItemOfIterable<Array<11>>>().type.toBe<11>();
});
