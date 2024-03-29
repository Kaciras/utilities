import { expect, test } from "tstyche";
import { noop } from "../../src/lang.ts";
import { createClient, probeClient, Remote, ResponseMessage, SendFn, VoidRemote } from "../../src/rpc.ts";

const sender = noop as () => ResponseMessage;

test("SendFn", () => {
	const syncResp: SendFn = (_, __) => ({} as ResponseMessage);
	const asyncResp: SendFn = async (_, __) => ({} as ResponseMessage);

	const syncVoid: SendFn = (_, __) => {};
	const asyncVoid: SendFn = async (_, __) => {};

	noop(syncResp, asyncResp, syncVoid, asyncVoid);
});

test("createClient", () => {
	const a = { foo: { bar: async () => {} } };
	const clientA = createClient<typeof a>(sender);
	expect(clientA.foo.bar).type.toEqual<() => Promise<void>>();

	const b = [0, 1, (_: 1) => "foo" as const] as const;
	const clientB = createClient<typeof b>(sender);
	expect(clientB[2]).type.toEqual<(i: 1) => Promise<"foo">>();
});

test("Emit mode sync", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(noop);

	expect(clientA.foo()).type.toEqual<Promise<void>>();
});

test("Emit mode async", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(async () => {});

	expect(clientA.foo()).type.toEqual<Promise<void>>();
});

test("Two-way client type", () => {
	const functions = { foo: () => "bar" };
	const clientA = createClient<typeof functions>(sender);

	expect(clientA.foo()).type.toEqual<Promise<string>>();
});

test("probeClient", () => {
	expect(probeClient({}, {})).type.toEqual<Remote<any>>();
	expect(probeClient({})).type.toEqual<Remote<any>>();
	expect(probeClient({}, false)).type.toEqual<VoidRemote<any>>();
});
