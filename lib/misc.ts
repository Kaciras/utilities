let uniqueIdCounter = 1;

/**
 * Generate a unique number, each call returns a different value.
 *
 * This function more efficient than `Math.random()`.
 */
export function uniqueId() {
	return uniqueIdCounter += 1;
}

/**
 * get a Promise that will be resolved after specified time.
 *
 * @param ms Time to sleep in millisecond.
 */
export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
