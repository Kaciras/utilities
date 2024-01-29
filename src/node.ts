// The entry point of @kaciras/utilities/node
import process from "process";

export * from "./lang.js";
export * from "./collection.js";
export * from "./codec.js";
export * from "./crypto.js";
export * from "./event.js";
export * from "./fetch.js";
export * from "./format.js";
export * from "./misc.js";
export * as RPC from "./rpc.js";
export { default as LRUCache } from "./LRUCache.js";

type Signals = NodeJS.Signals;

const exitSignals: Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT", "SIGHUP", "SIGBREAK"];

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
 * @see https://nodejs.org/dist/latest/docs/api/process.html#signal-events
 */
export function onExit(listener: (signal: Signals) => unknown) {
	let exiting = false;

	function handle(signal: Signals) {
		if (exiting) {
			process.exit(process.exitCode ?? 1);
		} else {
			exiting = true;
			listener(signal);
		}
	}

	for (const signal of exitSignals) {
		process.on(signal, handle);
	}

	return () => exitSignals.forEach(s => process.off(s, handle));
}
