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

let uniqueIdCounter = 0;

/**
 * Generate a unique positive number, each call returns a different value.
 *
 * This function more efficient than `Math.random()`.
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
