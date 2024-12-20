export type ItemOfIterable<T> = T extends Iterable<infer E>
	? E
	: T extends AsyncIterable<infer E> ? E : never;

export type Awaitable<T = unknown> = T | PromiseLike<T>;

export type OnFulfilled<T, R> = ((value: T) => R | PromiseLike<R>) | null;
export type OnRejected<R> = ((reason: any) => R | PromiseLike<R>) | null;

export const alwaysTrue: (..._: unknown[]) => true = () => true;
export const alwaysFalse: (..._: unknown[]) => false = () => false;

/** This function returns the first argument it receives. */
export const identity = <T>(v: T) => v;

export const noop: (..._: unknown[]) => void = () => {};
export const asyncNoop: (..._: unknown[]) => Promise<void> = async () => {};

/**
 * In JavaScript, every async function is actually an AsyncFunction object.
 * https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction
 */
export const AsyncFunction = asyncNoop.constructor as FunctionConstructor;

/**
 * Call a function silently. returns undefined if any error occurs.
 */
export function silentCall<T, A extends any[]>(fn: (...params: A) => T, ...args: A) {
	try { return fn(...args); } catch { /* return undefined; */ }
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

// https://stackoverflow.com/a/38642922/7065321
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ClassOf<T> = Function & { prototype: T }

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
 * # Compare with Lodash _.create
 * This function auto-detect `prototype` of parent, lodash does not.
 *
 * @param parent Prototype of returned object.
 * @param value Provide properties for returned object.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf
 */
export function createInstance<P extends object | null, C>(parent: P | ClassOf<P>, value: C) {
	const proto = typeof parent === "function" ? parent.prototype : parent;
	return Object.assign(Object.create(proto), value) as P extends null ? C : P & C;
}
