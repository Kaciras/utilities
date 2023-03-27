import { expectType } from "tsd-lite";
import { createClient } from "../../src/rpc.js";

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
