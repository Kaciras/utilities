import { describe, expect, it } from "@jest/globals";
import { cartesianArray, cartesianObject, firstItem, MultiMap, UniqueMultiMap } from "../src/collection.ts";
import { assertListEquals } from "./global.ts";

describe("firstItem", () => {
	it("should work with empty iterable", () => {
		expect(firstItem(new Map())).toBeUndefined();
	});
	it("should return the first item", () => {
		expect(firstItem(new Set([11, 22]))).toBe(11);
	});
});

function multiMapBaseTests(Class: typeof MultiMap) {
	it("should calc correct count", () => {
		const map = new Class();
		expect(map.size).toBe(0);
		expect(map.count).toBe(0);

		map.add(11, 11);
		map.add(11, 22);
		map.add(222, 11);

		expect(map.size).toBe(2);
		expect(map.count).toBe(3);
	});

	it("should add items", () => {
		const map = new Class();
		map.add(11, 11, 22);
		map.add(11, 33);

		assertListEquals(map.get(11), [11, 22, 33]);
	});

	it("should distribute item to keys", () => {
		const map = new Class();
		map.distribute(["foo", "bar"], 11, 22);
		map.distribute(["bar"], 33);

		assertListEquals(map.get("foo"), [11, 22]);
		assertListEquals(map.get("bar"), [11, 22, 33]);
	});

	it("should delete items", () => {
		const map = new Class();
		expect(map.deleteItem(11, 11)).toBe(false);

		map.add(11, 11);
		map.add(11, 22);

		expect(map.deleteItem(11, 11)).toBe(true);
		assertListEquals(map.get(11), [22]);
	});

	it("should noop on remove item which is not exists", () => {
		const map = new Class();
		map.add(11, 11);

		expect(map.deleteItem(11, 22)).toBe(false);
		expect(map.deleteItem(22, 11)).toBe(false);

		expect(map.size).toBe(1);
		expect(map.count).toBe(1);
	});

	it("should remove empty lists", () => {
		const map = new Class();
		map.add(11, 11);

		expect(map.deleteItem(11, 11)).toBe(true);
		expect(map.size).toBe(0);
		expect(map.count).toBe(0);
		expect(map.hasItem(11, 11)).toBe(false);
	});

	it("should work on hasItem", () => {
		const map = new Class();
		expect(map.hasItem(11, 11)).toBe(false);

		map.add(11, 11);
		expect(map.hasItem(11, 11)).toBe(true);
		expect(map.hasItem(11, 22)).toBe(false);
	});

	it("should support iterate all items", () => {
		const map = new Class();
		map.add(11, 11, 22);
		map.add(22, 33);

		const iterator = map.items();
		expect(iterator.next()).toStrictEqual({ done: false, value: 11 });
		expect(iterator.next()).toStrictEqual({ done: false, value: 22 });
		expect(iterator.next()).toStrictEqual({ done: false, value: 33 });
		expect(iterator.next().done).toBe(true);
	});
}

describe("MultiMap", () => {
	multiMapBaseTests(MultiMap);

	it("should allow duplicated values in same key", () => {
		const map = new MultiMap();
		map.add(11, 11);
		map.add(11, 22, 11);
		expect(map.get(11)).toStrictEqual([11, 22, 11]);
	});
});

describe("UniqueMultiMap", () => {
	multiMapBaseTests(UniqueMultiMap as any);

	it("should ignore duplicated values in same key", () => {
		const map = new UniqueMultiMap();
		map.add(11, 11);
		map.add(11, 22, 11);

		expect(map.count).toBe(2);
		expect(map.get(11)).toStrictEqual(new Set([11, 22]));
	});
});

describe("cartesianObject", () => {
	it("should support empty fields", () => {
		const params = Array.from(cartesianObject({
			a: [0, 1],
			b: [],
			c: [2, 3, 4],
		}));
		expect(params).toHaveLength(0);
	});

	it("should support empty object", () => {
		const params = Array.from(cartesianObject({}));

		expect(params).toHaveLength(1);
		expect(Object.keys(params[0])).toHaveLength(0);
	});

	it("should ignore symbol keys", () => {
		const params = Array.from(cartesianObject({
			a: [0, 1],
			[Symbol()]: [2, 3, 4],
		}));
		expect(params).toStrictEqual([{ a: 0 }, { a: 1 }]);
	});

	it("should works", () => {
		const params = cartesianObject({
			a: [0, 1],
			b: [2],
			c: new Set([3, 4, 5]),
		});
		const expected = expect.arrayContaining([
			{ a: 0, b: 2, c: 3 },
			{ a: 0, b: 2, c: 4 },
			{ a: 0, b: 2, c: 5 },
			{ a: 1, b: 2, c: 3 },
			{ a: 1, b: 2, c: 4 },
			{ a: 1, b: 2, c: 5 },
		]);
		expect(Array.from(params)).toStrictEqual(expected);
	});

	it("should isolate each product", () => {
		const [first, second] = cartesianObject({
			a: [0],
			b: [20, 30, 40],
		});
		first.b = 40;
		expect(second).toStrictEqual({ a: 0, b: 30 });
	});
});

describe("cartesianObject with entries", () => {
	it("should works", () => {
		const params = cartesianObject([
			["a", [0, 1]],
			["b", [2]],
			["c", new Set([3, 4, 5])],
		]);
		const expected = expect.arrayContaining([
			{ a: 0, b: 2, c: 3 },
			{ a: 0, b: 2, c: 4 },
			{ a: 0, b: 2, c: 5 },
			{ a: 1, b: 2, c: 3 },
			{ a: 1, b: 2, c: 4 },
			{ a: 1, b: 2, c: 5 },
		]);
		expect(Array.from(params)).toStrictEqual(expected);
	});
});

describe("cartesianArray", () => {
	it("should support empty fields", () => {
		const iter = cartesianArray([
			[0, 1],
			[],
			[2, 3, 4],
		]);
		expect(Array.from(iter)).toHaveLength(0);
	});

	it("should support empty array", () => {
		const params = Array.from(cartesianArray([]));
		expect(params).toStrictEqual([[]]);
	});

	it("should works", () => {
		const iter = cartesianArray([
			[0, 1],
			new Set([20, 30, 40]),
		]);
		expect(Array.from(iter)).toStrictEqual([
			[0, 20], [0, 30], [0, 40],
			[1, 20], [1, 30], [1, 40],
		]);
	});

	it("should isolate each product", () => {
		const [first, second] = cartesianArray([
			[0],
			[20, 30, 40],
		]);
		first[1] = 40;
		expect(second).toStrictEqual([0, 30]);
	});
});
