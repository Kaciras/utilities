import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { createClient } from "../../src/rpc.js";

const ignore = undefined as any;

describe("createClient", () => {
	const a = { foo: { bar: async () => {} } };
	const clientA = createClient<typeof a>(ignore);
	expectType<() => Promise<void>>(clientA.foo.bar);

	const b = [0, 1, (_: 1) => "foo" as const] as const;
	const clientB = createClient<typeof b>(ignore);
	expectType<(i: 1) => Promise<"foo">>(clientB[2]);
});
