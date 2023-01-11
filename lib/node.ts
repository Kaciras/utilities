import process from "process";
import Signals = NodeJS.Signals;

export * from "./codec.js";
export * from "./crypto.js";
export * from "./event.js";
export * from "./fetch.js";
export * from "./format.js";
export * from "./misc.js";

export * as RPC from "./rpc.js";

export { default as LRUCache } from "./LRUCache.js";

/**
 * Add exit listener to be called when process receive terminating signals.
 *
 * When receive double event, for example Ctrl-C is pressed twice,
 * the process will exit immediately and code will be process.exitCode or 1.
 *
 * # Alternatives
 * [node-graceful](https://github.com/mrbar42/node-graceful)
 *
 * @param listener listener function
 */
export function onExit(listener: (signal: Signals) => any) {
	let exiting = false;

	function handle(signal: Signals) {
		if (exiting) {
			process.exit(process.exitCode ?? 1);
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
