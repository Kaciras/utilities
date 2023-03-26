/* eslint-disable @typescript-eslint/ban-types */

import { expectAssignable, expectType } from "tsd-lite";
import { Awaitable, cartesianProductArray, cartesianProductObj } from "../src/lang.js";
import { createClient } from "../src/rpc.js";

expectAssignable<Awaitable<number>>(11);
expectAssignable<Awaitable<number>>(Promise.resolve(11));


expectType<Iterable<{}>>(cartesianProductObj({}));

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

const ignore = undefined as any;

{
	const f = { foo: { bar: async () => {} } };
	const client = createClient<typeof f>(ignore);
	expectType<() => Promise<void>>(client.foo.bar);
}

{
	const f = [0, 1, (_: 1) => "foo" as const] as const;
	const client = createClient<typeof f>(ignore);
	expectType<(i: 1) => Promise<"foo">>(client[2]);
}
