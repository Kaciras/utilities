/**
 * get a Promise that will be resolved after specified time.
 *
 * @param ms Time to sleep in millisecond.
 */
export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
