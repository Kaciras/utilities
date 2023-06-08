/*
 * A simple RPC implementation for messaged-based API,
 * Inspired by: https://github.com/GoogleChromeLabs/comlink
 *
 * # Compare with Comlink
 * In addition to function calls, Comlink also supports construct, get and set.
 * But those operations is ugly, e.g.
 * `const sum = (await remote.a) + (await remote.b)`
 * And you cannot use like: `remote.a += 1`
 *
 * On the other hand, get for value is conflict with get nested method,
 * the server need `Comlink.proxy()` to distinguish them.
 *
 * IMO it's overdesign, so we only support function call.
 */
import { PostMessage, pubSub2ReqRes } from "./event.js";
import { noop } from "./lang.js";

/* ============================================================================= *\
 *                             Layer 1：Messaging
\* ============================================================================= */

/**
 * Because RPC should keep the signature of the remote function, we cannot add a parameter
 * for transfers to remote function.
 *
 * We track transferable values with a map. This brings a new problem that
 * we cannot ensure that all the values added to the map are used.
 *
 * This has the potential for memory leaks, so use WeakMap instead of Map.
 */
const transferCache = new WeakMap<any, Transferable[]>();

/**
 * By default, every function parameter, return value and object property value is copied,
 * in the sense of structured cloning.
 *
 * If you want a value to be transferred rather than copied,
 * you can wrap the value in a transfer() call and provide a list of transferable values:
 *
 * @example
 * const data = new Uint8Array([1, 2, 3, 4, 5]);
 * await client.someFunction(transfer(data, [data.buffer]));
 *
 * @param obj The object contains transferable values.
 * @param transfers List of values to transfer.
 */
export function transfer<T>(obj: T, transfers: Transferable[]) {
	transferCache.set(obj, transfers);
	return obj;
}

export interface RequestMessage {
	a: any[];			// arguments
	p: PropertyKey[];	// path
	s?: number;			// session Id
}

export type ResponseMessage = ({
	v: unknown;			// value
} | {
	e: unknown;			// error
}) & {
	s?: number;			// session Id
};

export function invoker(send: RPCSend, handleReturn: boolean) {
	return async (path: PropertyKey[], args: any[]) => {
		const transfers: Transferable[] = [];
		for (const arg of args) {
			const ts = transferCache.get(arg);
			if (ts) {
				transfers.push(...ts);
			}
		}
		const resp = await send({ p: path, a: args }, transfers);
		if (handleReturn) {
			if ("e" in resp) throw resp.e; else return resp.v;
		}
	};
}

type Invoker = ReturnType<typeof invoker>;

type ServeResultTuple = [ResponseMessage, Transferable[]];

/**
 * Handle an RPC request, call specific method in the target.
 *
 * This function can be used for request-response model.
 *
 * @example
 * // Create RPC server on http://localhost:9789
 * import consumers from "stream/consumers";
 * import { RPC } from "@kaciras/utilities/browser";
 *
 * const functions = {
 * 		hello: (name: string) => `Hello ${name}!`,
 * 	};
 *
 * 	const server = http.createServer((req, res) => {
 * 		consumers.json(req)
 * 			.then(msg => RPC.serve(functions, msg))
 * 			.then(d => res.end(JSON.stringify(d[0])));
 * 	});
 *
 * 	server.listen(9789);
 *
 * @param target The service object contains methods that client can use.
 * @param message RPC request message.
 */
export async function serve(target: any, message: RequestMessage) {
	const { s, p, a } = message;

	try {
		for (let k = p.length - 1; k > 0; k--) {
			target = target[p[k]];
		}
		const v = await target[p[0]](...a);
		return <ServeResultTuple>[
			{ s, v },
			transferCache.get(v) ?? [],
		];
	} catch (e) {
		return [{ s, e }, []] as ServeResultTuple;
	}
}

export type Respond = (resp: ResponseMessage, transfer: Transferable[]) => void;

export function createServer(target: any, respond: Respond = noop) {
	return async (message: RequestMessage) => {
		if (typeof message !== "object") {
			return; // Not an RPC message.
		}
		if (Array.isArray(message.p)) {
			respond(...await serve(target, message));
		}
	};
}

/* ============================================================================= *
 *                         Layer 2: High level API
 * ============================================================================= */

/**
 * Takes a type and wraps it in a Promise, if it not already is one.
 * This is to avoid `Promise<Promise<T>>`.
 *
 * This is the inverse of `Awaited<T>`.
 */
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

type RemoteProperty<T> =
// eslint-disable-next-line @typescript-eslint/ban-types
	T extends Function ? RemoteCallable<T>
		: T extends object ? Remote<T> : T;

export type Remote<T> = {
	[P in keyof T]: RemoteProperty<T[P]>;
};

type RemoteCallable<T> = T extends (...args: infer A) => infer R
	? (...args: A) => Promisify<Awaited<R>> : unknown;

// --------------- Remote for one-way communication -------------

export type VoidRemote<T> = {
	[P in keyof T]: VoidRemoteProperty<T[P]>;
}

type VoidRemoteProperty<T> =
// eslint-disable-next-line @typescript-eslint/ban-types
	T extends Function ? VoidCallable<T>
		: T extends object ? VoidRemote<T> : T;

type VoidCallable<T> = T extends (...args: infer A) => any
	? (...args: A) => Promise<void> : unknown;

export type RPCSend = (message: RequestMessage, transfer: Transferable[]) => Promise<ResponseMessage>;

class RPCHandler implements ProxyHandler<Invoker> {

	/**
	 * Keys for current property in reversed order.
	 *
	 * @example
	 * createRPCClient().foo.bar[0] -> [0, "bar", "foo"]
	 */
	private readonly path: PropertyKey[];

	constructor(path: PropertyKey[]) {
		this.path = path;
	}

	async apply(invoke: Invoker, _: unknown, args: any[]) {
		return invoke(this.path, args);
	}

	get(invoke: Invoker, key: PropertyKey): any {
		return new Proxy(invoke, new RPCHandler([key, ...this.path]));
	}
}

type Listen = (callback: (message: ResponseMessage) => void) => void;

export function createEmitter<T = any>(post: PostMessage) {
	const invoke = invoker(post as any, false);
	return new Proxy(invoke, new RPCHandler([])) as unknown as VoidRemote<T>;
}

/**
 * Create an RPC client with publish-subscribe channel.
 *
 * @param post Function to post request message.
 * @param listen Listener to receive response message.
 */
export function createClient<T = any>(post: PostMessage, listen: Listen): Remote<T>;

/**
 * Create an RPC client with request-response channel.
 *
 * @example
 * // Call remote function `hello` with HTTP protocol.
 * import { RPC } from "@kaciras/utilities/browser";
 *
 * const client = RPC.createClient(async message => {
 *     const response = await fetch("http://localhost:9789", {
 *         method: "POST",
 *         body: JSON.stringify(message),
 *     });
 *     if (response.ok) {
 *         return response.json();
 *     } else {
 *         throw new Error("fetch failed: " + response.status);
 *     }
 * });
 *
 * expect(await client.hello("world")).toBe("Hello world!");
 *
 * @param send Function to post request message and receive response message.
 */
export function createClient<T = any>(send: RPCSend): Remote<T>;

export function createClient<T = any>(send: any, listen?: any) {
	if (listen) {
		const { request, dispatch } = pubSub2ReqRes(send);
		send = request;
		listen(dispatch);
	}
	const invoke = invoker(send, true);
	return new Proxy(invoke, new RPCHandler([])) as unknown as Remote<T>;
}
