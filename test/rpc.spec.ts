import { describe, expect, it, jest } from "@jest/globals";
import { createClient, createServer, Respond, RPCSend, transfer } from "../src/rpc.js";

function memoryPipe() {
	let receive: any;

	function addListener(re: any) {
		receive = re;
	}

	function publish(message: any) {
		queueMicrotask(() => receive?.(message, dispatch));
	}

	const { request, dispatch } = pubSub2ReqRes(publish, 100);

	return { request, addListener };
}

describe("RPC", () => {
	it("should works", async () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({
			hello(name: string) {
				return `hello ${name}`;
			},
		}));
		const client = createClient(request);
		expect(await client.hello("world")).toBe("hello world");
	});

	it("should transfer object to server", async () => {
		const request = jest.fn<RPCSend>(async () => ({ v: 11, isError: false }));
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
		const respond = jest.fn<Respond>();
		const arg0 = new Uint8Array([1, 2]);

		const foobar = () => transfer(arg0, [arg0.buffer]);
		const msg = { p: ["foobar"], a: [] };

		await serve({ foobar }, msg, respond);

		const [message, transfers] = respond.mock.calls[0];
		expect(message).toStrictEqual({
			s: undefined,
			v: arg0,
		});
		expect(transfers).toStrictEqual([arg0.buffer]);
	});

	it("should fail if function not found", () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({}));
		const client = createClient(request);
		return expect(client.hello("world")).rejects.toThrow(TypeError);
	});

	it("should forward errors", () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({
			hello() {
				throw new TypeError("Test error");
			},
		}));
		const client = createClient(request);
		return expect(client.hello("world"))
			.rejects
			.toThrow(new TypeError("Test error"));
	});

	it("should forward rejections", () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({
			hello() {
				return Promise.reject(new TypeError("Test error"));
			},
		}));
		const client = createClient(request);
		return expect(client.hello("world"))
			.rejects
			.toThrow(new TypeError("Test error"));
	});

	it("should support array index", () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({
			foo: [null, () => "hello"],
		}));
		const client = createClient(request);
		return expect(client.foo[1]()).resolves.toBe("hello");
	});

	it("should support nested objects", () => {
		const { request, addListener } = memoryPipe();
		addListener(createServer({
			foo: { bar: { baz: () => "hello" } },
		}));
		const client = createClient(request);
		return expect(client.foo.bar.baz()).resolves.toBe("hello");
	});
});
