import { describe, expect, it } from "@jest/globals";
import {
	cartesianProduct,
	createInstance,
	identity,
	MultiMap,
	NeverAbort,
	silencePromise,
	silentCall,
	sleep,
	uniqueId,
} from "../lib/misc.js";

describe("identity", () => {
	it("should return the argument", () => {
		expect(identity(1122)).toBe(1122);
	});
});

describe("inherit", () => {
	const invalidArgs = ["", 11, undefined, true, Symbol()];

	it.each(invalidArgs)("should throw error for invalid parent %s", p => {
		// @ts-expect-error
		expect(() => createInstance(p, 45)).toThrow();
	});

	it("should support null as parent", () => {
		const instance = createInstance(null, { aa: 11 });
		expect(instance.aa).toBe(11);
		expect(Object.getPrototypeOf(instance)).toBeNull();
	});

	it("should set prototype to the parent object", () => {
		const foo = { aa: 11, bb: 22 };
		const instance = createInstance(foo, { aa: 33 });

		expect(instance.aa).toBe(33);
		expect(instance.bb).toBe(22);
	});

	it("should set prototype to the parent class", () => {
		class Foo {
			aa() { return 11; }

			bb() { return 22; }
		}

		const instance = createInstance(Foo, { aa() { return 33;} });

		expect(instance.aa()).toBe(33);
		expect(instance.bb()).toBe(22);
	});
});

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

	it("should throw error on unsupported operation", () => {
		expect(() => NeverAbort.dispatchEvent(new Event("abort"))).toThrow("Not supported");
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

describe("silence", () => {
	const returnFn = () => 11;
	const throwFn = () => { throw new Error(); };

	it("should works", () => {
		expect(silentCall(returnFn)).toBe(11);
		expect(silentCall(throwFn)).toBeUndefined();
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

describe("cartesianProduct", () => {
	it("should support empty fields", () => {
		const params = Array.from(cartesianProduct({
			a: [0, 1],
			b: [],
			c: [2, 3, 4],
		}));
		expect(params).toHaveLength(0);
	});
	
	it("should support empty object", () => {
		const params = Array.from(cartesianProduct({}));

		expect(params).toHaveLength(1);
		expect(Object.keys(params[0])).toHaveLength(0);
	});

	it("should generate cartesian product", () => {
		const params = cartesianProduct({
			a: [0, 1],
			b: [2, 3, 4],
		});
		const expected = expect.arrayContaining([
			{ a: 0, b: 2 },
			{ a: 0, b: 3 },
			{ a: 0, b: 4 },
			{ a: 1, b: 2 },
			{ a: 1, b: 3 },
			{ a: 1, b: 4 },
		]);
		expect(Array.from(params)).toEqual(expected);
	});

	it("should isolate each product", () => {
		const [first, second] = cartesianProduct({
			a: [0],
			b: [2, 3],
		});
		first.a = 8964;
		expect(second).toStrictEqual({ a: 0, b: 3 });
	});
});
