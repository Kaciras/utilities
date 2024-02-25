// noinspection JSVoidFunctionReturnValueUsed

import { expect, test } from "tstyche";
import { Awaitable, ItemOfIterable, noop } from "../../src/lang.ts";

test("Awaitable", () => {
	expect(11).type.toMatch<Awaitable<number>>();
	expect(Promise.resolve(11)).type.toMatch<Awaitable<number>>();

	expect<void>().type.toMatch<Awaitable<void>>();
	expect<Promise<void>>().type.toMatch<Awaitable<void>>();
});

test("noop should accept arguments", () => {
	expect(noop()).type.toEqual<void>();
	expect(noop(11, 22, 33)).type.toEqual<void>();
});

test("ItemOfIterable", () => {
	function* generate() { yield 11 as const; }

	const apply = <T>(v: T) => v as ItemOfIterable<T>;
	expect(apply(generate())).type.toEqual<11>();
	expect<ItemOfIterable<Set<11>>>().type.toEqual<11>();
	expect<ItemOfIterable<Array<11>>>().type.toEqual<11>();
});
