import { ItemOfIterable } from "./lang.js";

/**
 * A Map which allows multiple values for the same Key.
 */
export class MultiMap<K, V> extends Map<K, V[]> {

	get count() {
		let returnValue = 0;
		for (const [, v] of this) {
			returnValue += v.length;
		}
		return returnValue;
	}

	* items() {
		for (const list of super.values()) yield* list;
	}

	add(key: K, ...values: V[]) {
		let list = super.get(key);
		if (!list) {
			super.set(key, list = []);
		}
		list.push(...values);
	}

	deleteItem(key: K, value: V) {
		const list = super.get(key);
		if (!list)
			return false;

		const i = list.indexOf(value);
		if (i === -1)
			return false;

		if (list.length === 1) {
			super.delete(key);
		} else {
			list.splice(i, 1);
		}

		return true;
	}

	hasItem(key: K, value: V) {
		const list = super.get(key);
		return list ? list.indexOf(value) !== -1 : false;
	}
}

export type CPSrcObject = Record<string, Iterable<unknown>>;

export type CPRowObject<T extends CPSrcObject> = {
	-readonly [K in keyof T]: ItemOfIterable<T[K]>
}

/**
 * Get the cartesian product generator of objects.
 *
 * @example
 * cartesianProductObj({
 *     a: [0, 1],
 *     b: [2],
 *     c: new Set([3, 4, 5]),
 * });
 * // Returns an iterable of:
 * { a: 0, b: 2, c: 3 }
 * { a: 0, b: 2, c: 4 }
 * { a: 0, b: 2, c: 5 }
 * { a: 1, b: 2, c: 3 }
 * { a: 1, b: 2, c: 4 }
 * { a: 1, b: 2, c: 5 }
 */
export function cartesianProductObj<const T extends CPSrcObject>(src: T) {
	const entries = Object.entries(src);
	const temp = {} as Record<string, unknown>;

	function* recursive(index: number): Iterable<unknown> {
		if (index === entries.length) {
			yield { ...temp };
		} else {
			const [key, values] = entries[index];
			for (const value of values) {
				temp[key] = value;
				yield* recursive(index + 1);
			}
		}
	}

	return recursive(0) as Iterable<CPRowObject<T>>;
}

export type CPSrcArray = ReadonlyArray<Iterable<unknown>>;

type CastArray<T extends CPSrcArray> =
	T extends readonly [infer E, ...infer REST]
		? REST extends CPSrcArray
			? [ItemOfIterable<E>, ...CastArray<REST>] : never : T;

export type CPRowArray<T extends CPSrcArray> =
	T extends readonly [any, ...any[]] ? CastArray<T> : T[number];

/**
 * Get the cartesian product generator of multiple arrays.
 *
 * For Iterable inputs, just convert it to an array. The recursive function will be
 * called multiple times at each index, we still need an array to hold the elements.
 * e.g. `cartesianProductArray(Array.from(iterable))`.
 *
 * @example
 * cartesianProductArray([
 *     [0, 1],
 *     [2],
 *     new Set([3, 4, 5]),
 * ]);
 * // Returns an iterable of:
 * [0, 2, 3]
 * [0, 2, 4]
 * [0, 2, 5]
 * [1, 2, 3]
 * [1, 2, 4]
 * [1, 2, 5]
 */
export function cartesianProductArray<const T extends CPSrcArray>(src: T) {
	const temp = new Array<unknown>(src.length);

	function* recursive(index: number): Iterable<unknown> {
		if (index === src.length) {
			yield [...temp];
		} else {
			for (const value of src[index]) {
				temp[index] = value;
				yield* recursive(index + 1);
			}
		}
	}

	return recursive(0) as Iterable<CPRowArray<T>>;
}
