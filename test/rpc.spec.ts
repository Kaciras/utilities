import consumers from "stream/consumers";
import * as http from "http";
import { EventEmitter } from "events";
import { describe, expect, it, jest } from "@jest/globals";
import { Communicate, createClient, createServer, Respond, serve, transfer } from "../src/rpc.js";

function createTestRPC<T>(controller: T) {
	let respond: Respond;

	function respondLazyInit(message: any, ts: Transferable[]) {
		respond(message, ts);
	}

	const serve = createServer(controller, respondLazyInit);
	return createClient<T>(serve, c => respond = c);
}

function alice() {
	return "Hi I am alice";
}

function bob(name: string) {
	return `Hello ${name}`;
}

it("demo - duplex MessageChannel", async () => {
	const { port1, port2 } = new MessageChannel();
	const post1 = port1.postMessage.bind(port1);
	const post2 = port2.postMessage.bind(port2);

	const clientA = createClient(post1, callback => {
		port1.addEventListener("message", e => callback(e.data));
	});
	const serverA = createServer({ alice }, post1);
	port1.addEventListener("message", e => serverA(e.data));

	const clientB = createClient(post2, callback => {
		port2.addEventListener("message", e => callback(e.data));
	});
	const serverB = createServer({ bob }, post2);
	port2.addEventListener("message", e => serverB(e.data));

	expect(await clientB.alice()).toBe("Hi I am alice");
	expect(await clientA.bob("world")).toBe("Hello world");

	port1.close();
});

it("demo - HTTP", async () => {
	const functions = {
		hello: (name: string) => `Hello ${name}!`,
	};

	const server = http.createServer((req, res) => {
		consumers.json(req)
			.then((msg: any) => serve(functions, msg))
			.then(d => res.end(JSON.stringify(d[0])));
	});

	server.listen(9789);

	// ↑ server side. =================== client side ↓.

	const client = createClient(async message => {
		const response = await fetch("http://localhost:9789", {
			method: "POST",
			body: JSON.stringify(message),
		});
		if (response.ok) {
			return response.json();
		} else {
			throw new Error("fetch failed: " + response.status);
		}
	});

	expect(await client.hello("world")).toBe("Hello world!");

	server.close();
});

it("should transfer object to server", async () => {
	const request = jest.fn<Communicate>(async () => ({ v: 11 }));
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

	expect(message).toStrictEqual({ s: undefined, v: arg0 });
	expect(transfers).toStrictEqual([arg0.buffer]);
});

it("should have no conflict between request & response message", async () => {
	const emitter = new EventEmitter();
	const post = emitter.emit.bind(emitter, "message");
	const hello = jest.fn(() => "world");

	const client = createClient(post, callback => {
		emitter.on("message", callback);
	});
	emitter.on("message", createServer({ hello }, post));

	expect(await client.hello("foobar")).toBe("world");
	expect(hello).toHaveBeenCalledTimes(1);
	expect(hello).toHaveBeenCalledWith("foobar");
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
	const client = createTestRPC([null, () => "hello"] as const);
	return expect(client[1]()).resolves.toBe("hello");
});

it("should support nested objects", () => {
	const client = createTestRPC({
		foo: { bar: [() => "hello"] },
	});
	return expect(client.foo.bar[0]()).resolves.toBe("hello");
});

describe("One-direction messaging", () => {
	it("should works", async () => {
		const hello = jest.fn();
		const server = createServer({ hello });
		const client = createClient(server);

		await client.hello(11);
		expect(hello).toHaveBeenCalledTimes(1);
		expect(hello).toHaveBeenCalledWith(11);
	});

	it("should not care whatever method exists", () => {
		const server = createServer({});
		const client = createClient(server);
		return expect(client.hello()).resolves.toBeUndefined();
	});

	it("should not care of remote errors", () => {
		const server = createServer({
			hello() {throw new Error();},
		});
		const client = createClient(server);
		return expect(client.hello()).resolves.toBeUndefined();
	});

	it("should not care of remote result", () => {
		const server = createServer({
			hello: () => 11,
		});
		const client = createClient(server);
		return expect(client.hello()).resolves.toBeUndefined();
	});
});
