import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { createClient, ResponseMessage, SendFn } from "../../src/rpc.js";
import { noop } from "../../src/lang.js";

const sender = 0 as unknown as () => ResponseMessage;

describe("SendFn", () => {
	const syncResp: SendFn = (_, __) => ({} as ResponseMessage);
	const asyncResp: SendFn = async (_, __) => ({} as ResponseMessage);

	const syncVoid: SendFn = (_, __) => {};
	const asyncVoid: SendFn = async (_, __) => {};

	noop(syncResp, asyncResp, syncVoid, asyncVoid);
});

describe("createClient", () => {
	const a = { foo: { bar: async () => {} } };
	const clientA = createClient<typeof a>(sender);
	expectType<() => Promise<void>>(clientA.foo.bar);

	const b = [0, 1, (_: 1) => "foo" as const] as const;
	const clientB = createClient<typeof b>(sender);
	expectType<(i: 1) => Promise<"foo">>(clientB[2]);
});

describe("Emit mode sync", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(noop);

	expectType<Promise<void>>(clientA.foo());
});

describe("Emit mode async", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(async () => {});

	expectType<Promise<void>>(clientA.foo());
});

describe("Two-way client type", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(sender);

	expectType<Promise<string>>(clientA.foo());
});
