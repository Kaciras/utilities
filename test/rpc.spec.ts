import { describe, expect, it } from "@jest/globals";
import { pubSub2ReqRes } from "../lib/rpc.js";

function newDuplexPipe() {

}

const TIMED_OUT = Symbol();

async function expectNotFullfilled(promise: Promise<unknown>, ms: number) {
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

	it("should receive response", async () => {
		const received: any[] = [];
		const { txMap, request, subscribe } = pubSub2ReqRes(m => received.push(m));

		const p1 = request({ value: 11 });
		const p2 = request({ value: 33 });

		const response = { id: received[1].id, msg: "foo" };
		subscribe(response);
		await expect(p2).resolves.toStrictEqual(response);

		expect(txMap.size).toBe(1);
		await expectNotFullfilled(p1, 100);
	});
});
