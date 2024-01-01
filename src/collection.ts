import { ItemOfIterable } from "./lang.js";

/**
 * Get the first item of the iterable object, or undefined if it's empty.
 *
 * NOTE: Code after the first yield in Generator will not be executed.
 */
export function firstItem<T>(iterable: Iterable<T>) {
	// noinspection LoopStatementThatDoesntLoopJS
	for (const item of iterable) return item;
}

/**
 * A Map which allows multiple values for the same Key.
 *
 * Methods inherited from Map are used for entire array of values.
 *
 * @example
 * const map = new MultiMap<string, number>();
 * map.set("A", [11, 22]);	// A -> [11, 22]
 * map.add("B", 11);		// B -> [11]
 * map.add("B", 22);		// B -> [11, 22]
 *
 * map.size;				// 2
 * map.count;				// 4
 *
 * map.has("A");			// true
 * map.hasItem("A", 11);	// true
 * map.hasItem("A", 33);	// false
 *
 * map.deleteItem("B", 33);	// false, B -> [11, 22]
 * map.deleteItem("B", 22);	// true,  B -> [11]
 * map.delete("A");			// true,  A no longer exists.
 */
export class MultiMap<K, V> extends Map<K, V[]> {

	/**
	 * The number of values in this Map.
	 */
	get count() {
		let returnValue = 0;
		for (const [, v] of this) {
			returnValue += v.length;
		}
		return returnValue;
	}

	/**
	 * Get the iterator of values.
	 */
	* items() {
		for (const list of super.values()) yield* list;
	}

	/**
	 * Adds new values to the array of the specified key.
	 */
	add(key: K, ...values: V[]) {
		let list = super.get(key);
		if (!list) {
			super.set(key, list = []);
		}
		list.push(...values);
	}

	/**
	 * Append values to each key.
	 */
	distribute(keys: Iterable<K>, ...values: V[]) {
		for (const key of keys) {
			this.add(key, ...values);
		}
	}

	/**
	 * Remove the value from array of the specified key.
	 *
	 * @returns true if a value in the Map existed and has been removed,
	 * 			or false if the value or the key does not exist.
	 */
	deleteItem(key: K, value: V) {
		const list = super.get(key);
		if (!list)
			return false;

		const i = list.indexOf(value);
		if (i === -1)
			return false;

		if (list.length === 1) {
			return super.delete(key);
		} else {
			return !!list.splice(i, 1);
		}
	}

	/**
	 * Returns a boolean indicating whether a value is exists in
	 * array of the specified key or not.
	 */
	hasItem(key: K, value: V) {
		const list = super.get(key);
		return list ? list.indexOf(value) !== -1 : false;
	}
}

export type CPSrcObject = Record<string, Iterable<unknown>>;

export type CPCellObject<T extends CPSrcObject> = {
	-readonly [K in Exclude<keyof T, symbol>]: ItemOfIterable<T[K]>
}

/**
 * Get the cartesian product generator of objects.
 *
 * NOTE: properties with symbol keys are ignored.
 *
 * @example
 * cartesianObject({
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
export function cartesianObject<const T extends CPSrcObject>(src: T) {
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

	return recursive(0) as Iterable<CPCellObject<T>>;
}

export type CPSrcArray = ReadonlyArray<Iterable<unknown>>;

type CastArray<T extends CPSrcArray> =
	T extends readonly [infer E, ...infer REST]
		? REST extends CPSrcArray
			? [ItemOfIterable<E>, ...CastArray<REST>] : never : T;

export type CPCellArray<T extends CPSrcArray> =
	T extends readonly [any, ...any[]] ? CastArray<T> : T[number];

/**
 * Get the cartesian product generator of multiple arrays.
 *
 * For Iterable src, just convert it to an array. The recursive function will be
 * called multiple times at each index, so we need to hold the elements.
 * e.g. `cartesianArray(Array.from(iterable))`.
 *
 * @example
 * cartesianArray([
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
export function cartesianArray<const T extends CPSrcArray>(src: T) {
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

	return recursive(0) as Iterable<CPCellArray<T>>;
}
