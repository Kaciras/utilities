import process from "process";
import Signals = NodeJS.Signals;

export * from "./codec.js";
export * from "./crypto.js";
export * from "./event.js";
export * from "./format.js";
export * from "./rpc.js";
export * from "./misc.js";

export { default as LRUCache } from "./LRUCache.js";

/**
 * Gs
 *
 * @param listener
 */
export function onExit(listener: (signal: Signals) => any) {
	let exiting = false;

	function handle(signal: Signals) {
		if (exiting) {
			process.exit(1);
		} else {
			exiting = true;
			listener(signal);
		}
	}

	const signals: Signals[] = [
		"SIGTERM",
		"SIGINT",
		"SIGQUIT",
		"SIGHUP",
		"SIGBREAK",
	];
	signals.forEach(signal => process.on(signal, handle));
}
