export type ItemOfIterable<T> = T extends Iterable<infer E> ? E : never;

export type Awaitable<T> = T | Promise<T>;

export type OnFulfilled<T, R> = ((value: T) => R | PromiseLike<R>) | null;
export type OnRejected<R> = ((reason: any) => R | PromiseLike<R>) | null;

export const noop: (..._: unknown[]) => void = () => {};

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
