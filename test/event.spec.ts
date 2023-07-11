import { describe, expect, it, jest } from "@jest/globals";
import { noop } from "../src/lang.ts";
import { MultiEventEmitter, pubSub2ReqRes, SingleEventEmitter } from "../src/event.ts";
import { Stubs } from "./global.ts";

describe("SingleEventEmitter", () => {
	const handler1 = jest.fn();
	const handler2 = jest.fn();

	it("should call listeners", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11, 22);
		emitter.dispatchEvent(33);

		for (const h of [handler1, handler2]) {
			expect(h).toHaveBeenCalledTimes(2);
			expect(h).toHaveBeenNthCalledWith(1, 11, 22);
			expect(h).toHaveBeenNthCalledWith(2, 33);
		}
	});

	it("should pass this to handlers", () => {
		expect.assertions(1);
		const emitter = new SingleEventEmitter();

		emitter.addListener(function () {
			expect(this).toBe(emitter);
		});
		emitter.dispatchEvent(11, 22);
	});

	it("should unbinds listener", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11, 22);
		emitter.removeListener(handler1);
		emitter.dispatchEvent(33);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should auto remove on once", () => {
		const emitter = new SingleEventEmitter();
		emitter.once(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11);
		emitter.dispatchEvent(22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11);
		expect(handler2).toHaveBeenNthCalledWith(2, 22);
	});

	it("should remove all listeners", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(() => emitter.removeAllListeners());
		emitter.addListener(handler2);

		emitter.dispatchEvent(11);
		emitter.dispatchEvent(22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenNthCalledWith(1, 11);
	});
});

interface EventTypes {
	foo: number[];
	bar: number[];
}

describe("MultiEventEmitter", () => {
	const handler1 = jest.fn();
	const handler2 = jest.fn();

	it("should ok for dispatch event without listeners", () => {
		const emitter = new MultiEventEmitter();
		emitter.dispatchEvent("foo", 11);
	});

	it("should call listeners", () => {
		const emitter = new MultiEventEmitter();
		emitter.addListener("foo", handler1);
		emitter.addListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("foo", 22);
		emitter.dispatchEvent("bar", 33);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);
		expect(handler1).toHaveBeenNthCalledWith(2, 22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenNthCalledWith(1, 33);
	});

	it("should pass this to handlers", () => {
		expect.assertions(1);
		const emitter = new MultiEventEmitter();

		emitter.addListener("foo", function () {
			expect(this).toBe(emitter);
		});
		emitter.dispatchEvent("foo", 11, 22);
	});

	it("should auto remove on once", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.once("foo", handler1);
		emitter.addListener("foo", handler2);
		emitter.once("bar", handler1);

		emitter.dispatchEvent("foo", 11, 22);
		emitter.dispatchEvent("foo", 33);
		emitter.dispatchEvent("bar", 44);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler1).toHaveBeenNthCalledWith(2, 44);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should ok for clear empty listener list", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.removeAllListeners();
		emitter.removeAllListeners("foo");
	});

	it("should ok for remove non exists listener", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.removeListener("foo", noop);
	});

	it("should remove the listener", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", handler1);
		emitter.addListener("foo", handler2);
		emitter.addListener("bar", handler1);

		emitter.removeListener("foo", handler1);
		emitter.removeListener("foo", handler1);
		emitter.removeListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenCalledWith(22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledWith(11);
	});

	it("should not leave empty listener array", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", handler1);
		emitter.removeListener("foo", handler1);

		expect(Object.entries((emitter as any).events)).toHaveLength(0);
	});

	it("should remove all listeners for specific event", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", () => emitter.removeAllListeners("foo"));
		emitter.addListener("foo", handler1);
		emitter.addListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("foo", 22);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	it("should remove all listeners", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", () => emitter.removeAllListeners());
		emitter.addListener("bar", handler1);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(0);
	});
});

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
		const mockPublish = jest.fn();
		const { txMap, request } = pubSub2ReqRes<any, any>(mockPublish);

		// noinspection ES6MissingAwait
		request({ value: 11 });
		// noinspection ES6MissingAwait
		request({ value: 33 });

		expect(txMap.size).toBe(2);
		expect(mockPublish.mock.calls).toStrictEqual([
			[{ s: 1, value: 11 }, []],
			[{ s: 2, value: 33 }, []],
		]);
	});

	it("should ignore messages without id", () => {
		pubSub2ReqRes(noop).receive({ foo: "bar" });
	});

	it("should ignore messages with unknown id", () => {
		const { request, receive } = pubSub2ReqRes(noop);

		const promise = request({});
		receive({ s: -11, foo: "bar" });
		return expectNotFulfilled(promise);
	});

	it("should forward errors from publish function", async () => {
		const post = jest.fn<any>().mockRejectedValue(Stubs.error);
		const { txMap, request } = pubSub2ReqRes(post);

		await expect(request({})).rejects.toThrow(Stubs.error);
		expect(txMap.size).toBe(0);
	});

	it("should receive response", async () => {
		const received: any[] = [];
		const { txMap, request, receive } = pubSub2ReqRes(m => {
			received.push(m);
		});

		const p1 = request({});
		const p2 = request({});

		const response = { r: received[1].s, msg: "foo" };
		receive(response);
		await expect(p2).resolves.toStrictEqual(response);

		expect(txMap.size).toBe(1);
		await expectNotFulfilled(p1);
	});

	it("should be able to handle response synchronous", async () => {
		const { request, receive } = pubSub2ReqRes(({ s }) => {
			receive({ r: s, foo: "bar" });
		});
		return expect((await request({})).foo).toBe("bar");
	});

	it("should clear the timer after transaction completed", withFakeTimer(() => {
		let s = -1;
		const { txMap, request, receive } = pubSub2ReqRes(m => s = (m as any).s, 100);
		request({});
		request({});
		expect(jest.getTimerCount()).toBe(2);

		receive({ r: s });

		expect(txMap.has(s)).toBe(false);
		expect(txMap.size).toBe(1);
		expect(jest.getTimerCount()).toBe(1);
	}));

	it("should support disable timeout", withFakeTimer(() => {
		const { txMap, request } = pubSub2ReqRes(noop, 0);
		request({});
		request({});

		expect(txMap.size).toBe(2);
		expect(jest.getTimerCount()).toBe(0);
	}));

	it("should not prevent Node from exit", () => {
		const { txMap, request } = pubSub2ReqRes(noop);
		request({});

		const { value } = txMap.values().next();
		expect(value.timer.hasRef()).toBe(false);
	});

	it("should support remove session from outside", withFakeTimer(async () => {
		const { txMap, request } = pubSub2ReqRes(noop, 100);
		const promise = request({});

		txMap.clear();
		jest.advanceTimersByTime(101);

		jest.useRealTimers();
		await expectNotFulfilled(promise);
	}));

	it("should clear expired sessions", withFakeTimer(async () => {
		const { txMap, request } = pubSub2ReqRes(noop, 100);
		const promise = request({});

		jest.advanceTimersByTime(101);

		expect(txMap.size).toBe(0);
		await expect(promise).rejects.toThrow(new Error("Timed out"));
	}));
});
