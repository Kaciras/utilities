import { expect, it, jest } from "@jest/globals";
import { createClient, createServer, Respond, RPCSend, serve, transfer } from "../src/rpc.js";

function createTestRPC<T>(controller: T) {
	let respond: Respond;

	function respondLazyInit(message: any, ts: Transferable[]) {
		respond(message, ts);
	}

	const serve = createServer(controller, respondLazyInit, "e");
	return createClient<T>(serve, "e", c => respond = c);
}

function alice() {
	return `Hi I am alice`;
}

function bob(name: string) {
	return `Hello ${name}`;
}

it("should works duplex", async () => {
	const { port1, port2 } = new MessageChannel();
	const post1 = port1.postMessage.bind(port1);
	const post2 = port2.postMessage.bind(port2);

	const clientA = createClient(post1, "Test", callback => {
		port1.addEventListener("message", e => callback(e.data));
	});
	const serverA = createServer({ alice }, post1, "Test");
	port1.addEventListener("message", e => serverA(e.data));

	const clientB = createClient(post2, "Test", callback => {
		port2.addEventListener("message", e => callback(e.data));
	});
	const serverB = createServer({ bob }, post2, "Test");
	port2.addEventListener("message", e => serverB(e.data));

	expect(await clientB.alice()).toBe("Hi I am alice");
	expect(await clientA.bob("world")).toBe("Hello world");

	port1.close();
});

it("should transfer object to server", async () => {
	const request = jest.fn<RPCSend>(async () => ({ v: 11 }));
	const client = createClient(request);

	const arg0 = new Uint8Array([1, 2]);
	const arg1 = new Uint8Array([3]);
	await client.foobar(
		transfer(arg0, [arg0.buffer]),
		transfer(arg1, [arg1.buffer]),
	);

	const [message, transfers] = request.mock.calls[0];
	expect(message).toStrictEqual({
		p: ["foobar"],
		a: [arg0, arg1],
	});
	expect(transfers).toStrictEqual([arg0.buffer, arg1.buffer]);
});

it("should transfer object to client", async () => {
	const arg0 = new Uint8Array([1, 2]);

	const foobar = () => transfer(arg0, [arg0.buffer]);
	const msg = { p: ["foobar"], a: [] };

	const [message, transfers] = await serve({ foobar }, msg);

	expect(message).toStrictEqual({ s: undefined, i: undefined, v: arg0 });
	expect(transfers).toStrictEqual([arg0.buffer]);
});

it("should fail if function not found", () => {
	const client = createTestRPC({});
	// @ts-expect-error
	return expect(client.hello("world")).rejects.toThrow(TypeError);
});

it("should forward errors", () => {
	const client = createTestRPC({
		hello() {
			throw new TypeError("Test error");
		},
	});
	return expect(client.hello())
		.rejects
		.toThrow(new TypeError("Test error"));
});

it("should forward rejections", () => {
	const client = createTestRPC({
		hello() {
			return Promise.reject(new TypeError("Test error"));
		},
	});
	return expect(client.hello())
		.rejects
		.toThrow(new TypeError("Test error"));
});

it("should support array index", () => {
	const client = createTestRPC({
		foo: [null, () => "hello"] as const,
	});
	return expect(client.foo[1]()).resolves.toBe("hello");
});

it("should support nested objects", () => {
	const client = createTestRPC({
		foo: { bar: { baz: () => "hello" } },
	});
	return expect(client.foo.bar.baz()).resolves.toBe("hello");
});
