import { describe, expect, it, jest } from "@jest/globals";
import { AbortError, NOOP } from "../lib/misc.js";
import { createClient, createServer, pubSub2ReqRes } from "../lib/rpc.js";

const TIMED_OUT = Symbol();

async function expectNotFulfilled(promise: Promise<unknown>, ms = 50) {
	const t = new Promise(resolve => setTimeout(resolve, ms, TIMED_OUT));
	const resolved = await Promise.race([promise, t]).catch(err => err);

	if (resolved !== TIMED_OUT) {
		throw new Error(`expected not to time out in ${ms}ms`);
	}
}

function withFakeTimer(fn: any) {
	return async (...args: unknown[]) => {
		jest.useFakeTimers();
		try {
			await fn(...args);
		} finally {
			jest.useRealTimers();
		}
	};
}

describe("pubSub2ReqRes", () => {
	it("should publish messages", async () => {
		const received: any[] = [];
		const { txMap, request } = pubSub2ReqRes(m => received.push(m));

		// noinspection ES6MissingAwait
		request({ value: 11 });
		// noinspection ES6MissingAwait
		request({ value: 33 });

		expect(txMap.size).toBe(2);
		expect(received).toStrictEqual([{ id: 2, value: 11 }, { id: 3, value: 33 }]);
	});

	it("should ignore messages without id", () => {
		pubSub2ReqRes(NOOP).dispatch({ foo: "bar" });
	});

	it("should ignore messages with unknown id", () => {
		const { request, dispatch } = pubSub2ReqRes(NOOP);

		const promise = request({});
		dispatch({ id: -11, foo: "bar" });
		return expectNotFulfilled(promise);
	});

	it("should receive response", async () => {
		const received: any[] = [];
		const { txMap, request, dispatch } = pubSub2ReqRes(m => received.push(m));

		const p1 = request({});
		const p2 = request({});

		const response = { id: received[1].id, msg: "foo" };
		dispatch(response);
		await expect(p2).resolves.toStrictEqual(response);

		expect(txMap.size).toBe(1);
		await expectNotFulfilled(p1);
	});

	it("should clear the timer after transaction completed", withFakeTimer(() => {
		let id = -1;
		const { txMap, request, dispatch } = pubSub2ReqRes(m => id = (m as any).id, 100);
		request({});
		request({});
		expect(jest.getTimerCount()).toBe(2);

		dispatch({ id });

		expect(txMap.has(id)).toBe(false);
		expect(txMap.size).toBe(1);
		expect(jest.getTimerCount()).toBe(1);
	}));

	it("should support disable timeout", withFakeTimer(() => {
		const { txMap, request } = pubSub2ReqRes(NOOP, 0);
		request({});
		request({});

		expect(txMap.size).toBe(2);
		expect(jest.getTimerCount()).toBe(0);
	}));

	it("should clear expired sessions", withFakeTimer(async () => {
		const { txMap, request } = pubSub2ReqRes(NOOP, 100);
		const promise = request({});

		jest.advanceTimersByTime(101);

		expect(txMap.size).toBe(0);
		await expect(promise).rejects.toThrow(new AbortError("Timed out"));
	}));
});

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
