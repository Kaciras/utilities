import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { statSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { setFlagsFromString } from "node:v8";

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

/*
 * Expose gc() function to global without any Node arguments requirement.
 * Note: --expose-gc cannot be passed through NODE_OPTIONS.
 *
 * Inspired by https://github.com/legraphista/expose-gc, The project
 * missing undo for changed flags, so we implemented it ourselves.
 */
export function exposeGC() {
	if (global.gc) {
		return;
	}
	setFlagsFromString("--expose_gc");
	global.gc = runInNewContext("gc");
	setFlagsFromString("--no-expose-gc");
}

function isFileSync(path: string) {
	try { return statSync(fileURLToPath(path)).isFile(); } catch { return false; }
}

/**
 * Import the default export of a module uses file path from CWD.
 * The most common case is loading a configuration file.
 *
 * - If `module` is supplied, it will be treated as a required module,
 *   so non-existent file will throw an error.
 *
 * - if `module` is undefined, it will load module from defaults in order
 *   and just ignore files that not found.
 *
 * - If both parameters are undefined, then returns undefined.
 *
 * @param module Path of the file to load.
 * @param defaults Fallback paths used if the module is undefined.
 */
export async function importCWD(module: string | undefined, defaults?: string[]) {
	if (module) {
		const url = pathToFileURL(module).toString();
		return (await import(url)).default;
	}
	for (const file of defaults ?? []) {
		const { href } = pathToFileURL(file);
		try {
			return (await import(href)).default;
		} catch (e) {
			if (
				e.code !== "ERR_MODULE_NOT_FOUND" &&	// ESM
				e.code !== "MODULE_NOT_FOUND" ||		// CJS
				isFileSync(import.meta.resolve(href))
			) {
				throw e; // Error inside the module should be thrown.
			}
		}
	}
}
