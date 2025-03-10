import { ItemOfIterable } from "./lang.ts";

/**
 * Get the first item of the iterable object, or undefined if it's empty.
 *
 * NOTE: Code after the first yield in Generator will not be executed.
 */
export function firstItem<T>(iterable: Iterable<T>) {
	// noinspection LoopStatementThatDoesntLoopJS,UnnecessaryLocalVariableJS
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
		const list = super.get(key);
		if (list) {
			list.push(...values);
		} else {
			super.set(key, [...values]);
		}
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
	 * Remove the first occurrence value from array of the specified key.
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

/**
 * Like MultiMap, but the values collection type is Set.
 */
export class UniqueMultiMap<K, V> extends Map<K, Set<V>> {
	get count() {
		let returnValue = 0;
		for (const [, v] of this) {
			returnValue += v.size;
		}
		return returnValue;
	}

	* items() {
		for (const list of super.values()) yield* list;
	}

	add(key: K, ...values: V[]) {
		const list = super.get(key);
		if (list) {
			for (const v of values) {
				list.add(v);
			}
		} else {
			super.set(key, new Set<V>(values));
		}
	}

	distribute(keys: Iterable<K>, ...values: V[]) {
		for (const key of keys) {
			this.add(key, ...values);
		}
	}

	deleteItem(key: K, value: V) {
		const list = super.get(key);
		const removed = list?.delete(value);
		if (!removed) {
			return false;
		}
		if (list!.size > 0) {
			return true;
		}
		return super.delete(key);
	}

	hasItem(key: K, value: V) {
		return !!super.get(key)?.has(value);
	}
}

export type CPSrcObject = Record<string, Iterable<unknown>>;

export type CPSrcEntries = ReadonlyArray<readonly [string, Iterable<unknown>]>;

type CPObjectInput = CPSrcObject | CPSrcEntries;

type CPCellObject<T extends CPSrcObject> = {
	-readonly [K in Exclude<keyof T, symbol>]: ItemOfIterable<T[K]>;
}

type CPCellEntries<T extends CPSrcEntries> = {
	[K in T[number] as K[0]]: ItemOfIterable<K[1]>;
};

export type CartesianObjectCell<T> = T extends CPSrcObject
	? CPCellObject<T>
	: T extends CPSrcEntries
		? CPCellEntries<T> : never;

/**
 * Get the cartesian product generator of objects.
 *
 * NOTE: properties with symbol keys are ignored if the src is an object.
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
 *
 * // Also support for entries, the following returns same result:
 * cartesianObject([
 *     ["a", [0, 1]],
 *     ["b", [2]],
 *     ["c", new Set([3, 4, 5])],
 * ]);
 */
export function* cartesianObject<const T extends CPObjectInput>(src: T) {
	const entries = Array.isArray(src) ? src : Object.entries(src);
	if (entries.length === 0) {
		yield {} as unknown as CartesianObjectCell<T>;
		return;
	}
	const state = new Array<Iterator<unknown> | undefined>(entries.length);
	const end = state.length - 1;
	const template: Record<string, unknown> = {};

	let index = 0;
	while (index !== -1) {
		const iterator = state[index] ??= entries[index][1][Symbol.iterator]();

		const { done, value } = iterator.next();
		if (done) {
			state[index--] = undefined;
			continue;
		}

		template[entries[index][0]] = value;

		if (index !== end) {
			index++;
		} else {
			yield { ...template } as unknown as CartesianObjectCell<T>;
		}
	}
}

export type CPArrayInput = ReadonlyArray<Iterable<unknown>>;

type CastArray<T extends CPArrayInput> =
	T extends readonly [infer E, ...infer REST]
		? REST extends CPArrayInput
			? [ItemOfIterable<E>, ...CastArray<REST>] : never : T;

export type CartesianArrayCell<T extends CPArrayInput> =
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
 *
 * // returns an empty Generator if a row is empty.
 * cartesianArray([
 *     [0, 1],
 *     [],
 *     new Set([3, 4, 5]),
 * ]);
 */
export function* cartesianArray<const T extends CPArrayInput>(src: T) {
	if (src.length === 0) {
		yield [] as unknown as CartesianArrayCell<T>;
		return;
	}
	const state = new Array<Iterator<unknown> | undefined>(src.length);
	const end = state.length - 1;
	const template = new Array<unknown>(src.length);

	let index = 0;
	while (index !== -1) {
		const iterator = state[index] ??= src[index][Symbol.iterator]();

		const { done, value } = iterator.next();
		if (done) {
			state[index--] = undefined;
			continue;
		}

		template[index] = value;

		if (index !== end) {
			index++;
		} else {
			yield [...template] as unknown as CartesianArrayCell<T>;
		}
	}
}
