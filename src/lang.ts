export type ItemOfIterable<T> = T extends Iterable<infer E> ? E : never;

export type Awaitable<T> = T | Promise<T>;

export const noop = () => {};
export const identity = <T>(v: T) => v;

// https://stackoverflow.com/a/38642922/7065321
// eslint-disable-next-line @typescript-eslint/ban-types
type Constructor<T> = Function & { prototype: T }

/**
 * Call a function silently. returns undefined if any error occurs.
 */
export function silentCall<T>(fn: () => T) {
	try { return fn(); } catch { /* return undefined; */ }
}

/**
 * Silence a Promise-like object. This is useful for avoiding non-harmful,
 * but potentially confusing "uncaught play promise" rejection error messages.
 *
 * @param value An object that may or may not be `Promise`-like.
 */
export function silencePromise(value: any) {
	if (typeof value?.then === "function") value.catch(noop);
}

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

type ObjectSrc = Record<string, Iterable<unknown>>;

type CartesianProductObject<T extends ObjectSrc> = {
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
export function cartesianProductObj<const T extends ObjectSrc>(src: T) {
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

	return recursive(0) as Iterable<CartesianProductObject<T>>;
}

type ArraySrc = ReadonlyArray<Iterable<unknown>>;

type CastArray<T extends ArraySrc> =
	T extends readonly [infer E, ...infer REST]
		? REST extends ArraySrc
			? [ItemOfIterable<E>, ...CastArray<REST>] : never : T;

type CartesianProductArray<T extends ArraySrc> =
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
export function cartesianProductArray<const T extends ArraySrc>(src: T) {
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

	return recursive(0) as Iterable<CartesianProductArray<T>>;
}

/**
 * Create a new instance with the `parent` as prototype and the `value` as child.
 *
 * # NOTES
 * If the parent is a constructor, it will not be called and just use its `prototype`.
 *
 * Does not support override getter-only properties.
 *
 * This function does not use `Object.setPrototypeOf` because it has bad performance.
 *
 * @param parent Prototype of returned object.
 * @param value Provide properties for returned object.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf
 */
export function createInstance<P extends object | null, C>(parent: P | Constructor<P>, value: C) {
	const proto = typeof parent === "function" ? parent.prototype : parent;
	return Object.assign(Object.create(proto), value) as P extends null ? C : P & C;
}
