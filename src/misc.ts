import tp from "timers/promises";

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
