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

/* ============================================================================= *\
 *                         Layer 1：Message protocol
\* ============================================================================= */

export type Respond = (resp: ResponseMessage, transfer?: Transferable[]) => void;

export type RPCSend = (message: RequestMessage, transfer?: Transferable[]) => Promise<ResponseMessage>;

export interface RequestMessage {
	a: any[];			// arguments
	p: PropertyKey[];	// path
	i?: unknown;		// identifier
	s?: number;			// session Id
}

export type ResponseMessage = ({
	v: unknown;			// value
} | {
	e: unknown;			// error
}) & {
	i?: unknown;		// identifier
	s?: number;			// session Id
};

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

async function callRemote(send: RPCSend, message: RequestMessage) {
	const transfers: Transferable[] = [];
	for (const arg of message.a) {
		const ts = transferCache.get(arg);
		if (ts) {
			transfers.push(...ts);
		}
	}
	const response = await send(message, transfers);
	if ("e" in response) throw response.e; else return response.v;
}

type ServeReturnValue = [ResponseMessage, Transferable[] | undefined];

/**
 * Handle an RPC request, call specific method in the target, and send the response.
 *
 * @param target The service object contains methods that client can use.
 * @param message RPC request message
 */
export async function serve(target: any, message: RequestMessage) {
	const { s, p, a, i } = message;

	try {
		for (let k = p.length - 1; k > 0; k--) {
			target = target[p[k]];
		}
		const v = await target[p[0]](...a);
		return <ServeReturnValue>[
			{ i, s, v },
			transferCache.get(v),
		];
	} catch (e) {
		return [{ i, s, e }, undefined] as ServeReturnValue;
	}
}

export function createServer(target: any, respond: Respond, id?: string) {
	return async (message: RequestMessage) => {
		if (typeof message !== "object") {
			return; // Not an RPC message.
		}
		const { p, i } = message;
		if (i === id && Array.isArray(p)) {
			respond(...await serve(target, message));
		}
	};
}

/* ============================================================================= *
 *                         Layer 2: The client object
 * ============================================================================= */

/**
 * Takes a type and wraps it in a Promise, if it not already is one.
 * This is to avoid `Promise<Promise<T>>`.
 *
 * This is the inverse of `Awaited<T>`.
 */
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

// eslint-disable-next-line @typescript-eslint/ban-types
type RemoteProperty<T> = T extends Function ? Remote<T> : T;

export type RemoteObject<T> = {
	[P in keyof T]: RemoteProperty<T[P]>;
};

type RemoteCallable<T> = T extends (...args: infer Args) => infer R
	? (...args: { [I in keyof Args]: Args[I] }) => Promisify<Awaited<R>> : unknown;

export type Remote<T> = RemoteObject<T> & RemoteCallable<T>;

class RPCHandler implements ProxyHandler<RPCSend> {

	/**
	 * ID of the client, used to filter messages.
	 */
	private readonly i: unknown;

	/**
	 * Keys for current property in reversed order.
	 *
	 * @example
	 * createRPCClient().foo.bar[0] -> [0, "bar", "foo"]
	 */
	private readonly p: PropertyKey[];

	constructor(id: unknown, path: PropertyKey[]) {
		this.i = id;
		this.p = path;
	}

	apply(send: RPCSend, thisArg: unknown, args: any[]) {
		const { i, p } = this;
		return callRemote(send, { i, p, a: args });
	}

	get(send: RPCSend, key: PropertyKey): any {
		const { i, p } = this;
		return new Proxy(send, new RPCHandler(i, [key, ...p]));
	}
}

export function createClient<T = any>(post: RPCSend, id?: string) {
	return new Proxy(post, new RPCHandler(id, [])) as Remote<T>;
}
