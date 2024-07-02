/**
 * An AbortSignal that never aborts.
 */
// @ts-expect-error `any()` is a static method, should not in there.
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

let uniqueIdCounter = 0;

/**
 * Generate a positive number, each call returns a increased value.
 *
 * This function is more efficient than `Math.random()`.
 */
export function uniqueId() {
	return uniqueIdCounter += 1;
}

/**
 * Get a Promise that will be fulfilled after specified time.
 * When canceled, the returned Promise will be rejected with an 'AbortError'.
 *
 * # Alternatives
 * In Node, you can import `setTimeout` from "timers/promises" instead.
 *
 * @param ms Time to sleep in millisecond.
 * @param signal An optional AbortSignal that can be used to cancel the scheduled sleep.
 */
export function sleep(ms: number, signal = NeverAbort) {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(signal.reason);
		}
		setTimeout(resolve, ms);
		signal.addEventListener("abort", () => reject(signal.reason));
	});
}

/**
 * If the specified key is not already associated with a value, attempts to
 * compute its value using the given mapping function and enters it into the cache.
 *
 * The computed value cannot be undefined, which is used to indicate the entry absent.
 *
 * @param cache The map to cache the computed value.
 * @param key key with which the specified value is to be associated
 * @param compute the mapping function to compute a value
 */
export function getCached<K, V>(cache: Map<K, V>, key: K, compute: (key: K) => V) {
	let value = cache.get(key);
	return value === undefined && cache.set(key, value = compute(key)), value;
}
