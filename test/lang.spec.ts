import { describe, expect, it } from "@jest/globals";
import {
	cartesianProductArray,
	cartesianProductObj,
	createInstance,
	identity,
	MultiMap,
	silencePromise,
	silentCall,
} from "../lib/lang.js";


describe("identity", () => {
	it("should return the argument", () => {
		expect(identity(1122)).toBe(1122);
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

describe("cartesianProductObj", () => {
	it("should support empty fields", () => {
		const params = Array.from(cartesianProductObj({
			a: [0, 1],
			b: [],
			c: [2, 3, 4],
		}));
		expect(params).toHaveLength(0);
	});

	it("should support empty object", () => {
		const params = Array.from(cartesianProductObj({}));

		expect(params).toHaveLength(1);
		expect(Object.keys(params[0])).toHaveLength(0);
	});

	it("should works", () => {
		const params = cartesianProductObj({
			a: [0, 1],
			b: [20, 30, 40],
		});
		const expected = expect.arrayContaining([
			{ a: 0, b: 20 },
			{ a: 0, b: 30 },
			{ a: 0, b: 40 },
			{ a: 1, b: 20 },
			{ a: 1, b: 30 },
			{ a: 1, b: 40 },
		]);
		expect(Array.from(params)).toEqual(expected);
	});

	it("should isolate each product", () => {
		const [first, second] = cartesianProductObj({
			a: [0],
			b: [20, 30],
		});
		first.a = 8964;
		expect(second).toStrictEqual({ a: 0, b: 30 });
	});
});

describe("cartesianProductArray", () => {
	it("should support empty fields", () => {
		const iter = cartesianProductArray([
			[0, 1],
			[],
			[2, 3, 4],
		]);
		expect(Array.from(iter)).toHaveLength(0);
	});

	it("should support empty array", () => {
		const params = Array.from(cartesianProductArray([]));
		expect(params).toEqual([[]]);
	});

	it("should works", () => {
		const iter = cartesianProductArray([
			[0, 1],
			[20, 30, 40],
		]);
		expect(Array.from(iter)).toEqual([
			[0, 20], [0, 30], [0, 40],
			[1, 20], [1, 30], [1, 40],
		]);
	});

	it("should isolate each product", () => {
		const [first, second] = cartesianProductArray([
			[0],
			[20, 30],
		]);
		first[0] = 8964;
		expect(second).toStrictEqual([0, 30]);
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
