import tp from "timers/promises";

export type Awaitable<T> = T | Promise<T>;

export const noop = () => {};
export const identity = <T>(v: T) => v;

// https://stackoverflow.com/a/38642922/7065321
// eslint-disable-next-line @typescript-eslint/ban-types
type Constructor<T> = Function & { prototype: T }

/**
 * An AbortSignal that never aborts.
 */
export const NeverAbort: AbortSignal = {
	aborted: false,
	reason: undefined,
	get onabort() { return null; },
	set onabort(_: any) {},
	throwIfAborted() {},
	dispatchEvent() { throw new Error("Not supported"); },
	addEventListener() {},
	removeEventListener() {},
};

let uniqueIdCounter = 1;

/**
 * Generate a unique number, each call returns a different value.
 *
 * This function more efficient than `Math.random()`.
 */
export function uniqueId() {
	return uniqueIdCounter += 1;
}

export class AbortError extends Error {

	constructor(...args: any[]) {
		super(...args);
		this.name = "AbortError";
	}
}

/**
 * Get a Promise that will be fulfilled after specified time.
 * When canceled, the returned Promise will be rejected with an 'AbortError'.
 *
 * @param ms Time to sleep in millisecond.
 * @param signal An optional AbortSignal that can be used to cancel the scheduled sleep.
 */
export function sleep(ms: number, signal = NeverAbort) {
	if (typeof window === "undefined") {
		return tp.setTimeout(ms, undefined, { signal });
	}
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms);
		signal.addEventListener("abort", () => reject(new AbortError()));
	});
}

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
export function createInstance<P extends object | null, C>(parent: P | Constructor<P> , value: C) {
	const proto = typeof parent === "function" ? parent.prototype : parent;
	return Object.assign(Object.create(proto), value) as P extends null ? C : P & C;
}
