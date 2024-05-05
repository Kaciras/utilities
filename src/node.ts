import { pathToFileURL } from "url";
import process from "process";

export * from "./collection.ts";
export * from "./codec.ts";
export * from "./crypto.ts";
export * from "./event.ts";
export * from "./fetch.ts";
export * from "./format.ts";
export * from "./lang.ts";
export * from "./misc.ts";
export * from "./unit.ts";
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

/**
 * Import the default export of a module uses file path from CWD.
 *
 * If the `module` argument is supplied, it will be treated as a required module,
 * so non-existent files will throw an error. However, if `default_` is used,
 * it will return undefined if the file is not found.
 *
 * If `module` === `default_`, it equivalent to `module` is undefined.
 *
 * @param module Path of the file to load.
 * @param default_ Fallback path used if the module is undefined.
 */
export async function importCWD(module?: string, default_?: string) {
	module ??= default_;
	if (!module) {
		return; // Undefined for both is allowed.
	}
	try {
		const url = pathToFileURL(module).toString();
		return (await import(url)).default;
	} catch (e) {
		// Why there are 2 different error codes?
		if (module !== default_
			|| (e.code !== "ERR_MODULE_NOT_FOUND"
				&& e.code !== "MODULE_NOT_FOUND")) throw e;
	}
}
