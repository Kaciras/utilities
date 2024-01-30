// The entry point of @kaciras/utilities/node
import process from "process";

export * from "./lang.ts";
export * from "./collection.ts";
export * from "./codec.ts";
export * from "./crypto.ts";
export * from "./event.ts";
export * from "./fetch.ts";
export * from "./format.ts";
export * from "./misc.ts";
export * as RPC from "./rpc.ts";
export { default as LRUCache } from "./LRUCache.ts";

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
