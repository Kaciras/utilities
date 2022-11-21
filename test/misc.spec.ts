import { performance } from "perf_hooks";
import { describe, expect, it } from "@jest/globals";
import { NeverAbort, silencePromise, sleep, uniqueId } from "../lib/misc.js";

describe("NeverAbort", () => {
	it("should not abort", () => {
		expect(NeverAbort.aborted).toBe(false);
		expect(NeverAbort.dispatchEvent).toThrow();
	});

	it("should ignore listeners", () => {
		NeverAbort.onabort = () => 11;
		NeverAbort.removeEventListener("abort", () => 11);
		NeverAbort.addEventListener("abort", () => 11);

		expect(NeverAbort.onabort).toBeNull();
	});
});

describe("uniqueId", () => {
	it("should generate unique numbers", () => {
		const a = uniqueId();
		const b = uniqueId();

		expect(a).not.toBe(b);
		expect(a).not.toBe(uniqueId());
	});
});

describe("sleep", () => {
	it("should fulfill after the time", async () => {
		const begin = performance.now();
		await sleep(100);
		const end = performance.now();

		expect(end - begin).toBeGreaterThan(99);
	});

	it("should reject when cancelled", async () => {
		expect.assertions(1);
		const controller = new AbortController();
		controller.abort();

		try {
			await sleep(1000, controller.signal);
		} catch (e) {
			// eslint-disable-next-line jest/no-conditional-expect
			expect(e.name).toBe("AbortError");
		}
	});
});

describe("silencePromise", () => {
	it.each([
		new Promise(() => {}),
		undefined,
		null,
		silencePromise,
	])("should allow any arguments", arg => {
		return silencePromise(arg);
	});

	it("should works", () => {
		return silencePromise(Promise.reject(new Error("Shouldn't throw")));
	});
});

describe("MultiMap", () => {
	it("should calc correct count", () => {
		const map = new MultiMap();
		expect(map.size).toBe(0);
		expect(map.count).toBe(0);

		map.add(11, 11);
		map.add(11, 22);
		map.add(222, 11);

		expect(map.size).toBe(2);
		expect(map.count).toBe(3);
	});

	it("should add items", () => {
		const map = new MultiMap();

		map.add(11, 11);
		map.add(11, 22, 11);

		expect(map.get(11)).toStrictEqual([11, 22, 11]);
	});

	it("should delete items", () => {
		const map = new MultiMap();
		expect(map.deleteItem(11, 11)).toBe(false);

		map.add(11, 11);
		map.add(11, 22);

		expect(map.deleteItem(11, 11)).toBe(true);
		expect(map.get(11)).toStrictEqual([22]);
	});

	it("should noop on remove item which is not exists", () => {
		const map = new MultiMap();
		map.add(11, 11);

		expect(map.deleteItem(11, 22)).toBe(false);
		expect(map.deleteItem(22, 11)).toBe(false);

		expect(map.size).toBe(1);
		expect(map.count).toBe(1);
	});

	it("should remove empty arrays", () => {
		const map = new MultiMap();
		map.add(11, 11);

		expect(map.deleteItem(11, 11)).toBe(true);
		expect(map.size).toBe(0);
		expect(map.count).toBe(0);
		expect(map.hasItem(11, 11)).toBe(false);
	});

	it("should work on hasItem", () => {
		const map = new MultiMap();
		expect(map.hasItem(11, 11)).toBe(false);

		map.add(11, 11);
		expect(map.hasItem(11, 11)).toBe(true);
		expect(map.hasItem(11, 22)).toBe(false);
	});

	it("should support iterate all items", () => {
		const map = new MultiMap();
		map.add(11, 11, 22);
		map.add(22, 33);

		const iterator = map.items();
		expect(iterator.next()).toStrictEqual({ done: false, value: 11 });
		expect(iterator.next()).toStrictEqual({ done: false, value: 22 });
		expect(iterator.next()).toStrictEqual({ done: false, value: 33 });
		expect(iterator.next().done).toBe(true);
	});
});
