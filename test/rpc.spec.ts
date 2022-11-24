import { describe, expect, it } from "@jest/globals";
import { AbortError, NOOP, sleep } from "../lib/misc.js";
import { pubSub2ReqRes } from "../lib/rpc.js";

function newDuplexPipe() {

}

const TIMED_OUT = Symbol();

async function expectNotFulfilled(promise: Promise<unknown>, ms: number) {
	const t = new Promise(resolve => setTimeout(resolve, ms, TIMED_OUT));
	const resolved = await Promise.race([promise, t]).catch(err => err);

	if (resolved !== TIMED_OUT) {
		throw new Error(`expected not to time out in ${ms}ms`);
	}
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

	it("should throw error when receive a message without id", () => {
		const { subscribe } = pubSub2ReqRes(NOOP);
		expect(() => subscribe({ foo: "bar" }))
			.toThrow("Message ID it not associated to session");
	});

	it("should throw error when receive a message with unknown id", () => {
		const { request, subscribe } = pubSub2ReqRes(NOOP);

		request({});

		expect(() => subscribe({ id: -11, foo: "bar" }))
			.toThrow("Message ID it not associated to session");
	});

	it("should receive response", async () => {
		const received: any[] = [];
		const { txMap, request, subscribe } = pubSub2ReqRes(m => received.push(m));

		const p1 = request({});
		const p2 = request({});

		const response = { id: received[1].id, msg: "foo" };
		subscribe(response);
		await expect(p2).resolves.toStrictEqual(response);

		expect(txMap.size).toBe(1);
		await expectNotFulfilled(p1, 100);
	});

	it("should clear timers", async () => {
		let id = -1;
		const { txMap, request, subscribe } = pubSub2ReqRes(m => id = (m as any).id, 100);

		// noinspection ES6MissingAwait
		request({});
		const controller = txMap.get(id);

		subscribe({ id });

		// Add session back and check it not be removed after timeout.
		txMap.set(id, controller!);
		await sleep(101);
		expect(txMap.size).toBe(1);
	});

	it("should clear expired sessions", async () => {
		const { txMap, request } = pubSub2ReqRes(NOOP, 100);
		const before = performance.now();

		await expect(request({})).rejects.toThrow(new AbortError());

		expect(txMap.size).toBe(0);
		expect(performance.now() - before).toBeGreaterThanOrEqual(99);
	});
});