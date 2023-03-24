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
import { AbortError, uniqueId } from "./misc.js";

/* ============================================================================= *\
 *                         Layer 1：Message protocol
\* ============================================================================= */

export type Respond = (resp: ResponseMessage, transfer?: Transferable[]) => void;

export type RPCSend = (message: RequestMessage, transfer?: Transferable[]) => Promise<ResponseMessage>;

export type RPCReceive = (message: RequestMessage, respond: Respond) => void;

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
	if ("e" in response) {
		throw response.e;
	} else {
		return response.v;
	}
}

/**
 * Handle an RPC request, call specific method in the target, and send the response.
 *
 * @param target The service object contains methods that client can use.
 * @param message RPC request message
 * @param respond The function to send the response message.
 */
export async function serve(target: any, message: RequestMessage, respond: Respond) {
	const { s, p, a } = message;
	try {
		for (let i = p.length - 1; i > 0; i--) {
			target = target[p[i]];
		}
		const v = await target[p[0]](...a);
		const transfers = transferCache.get(v);
		respond({ s, v }, transfers);
	} catch (e) {
		respond({ s, e });
	}
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
	 * Keys for current property in reversed order.
	 *
	 * @example
	 * createRPCClient().foo.bar[0] -> [0, "bar", "foo"]
	 */
	private readonly path: PropertyKey[];

	constructor(path: PropertyKey[]) {
		this.path = path;
	}

	apply(send: RPCSend, thisArg: any, args: any[]) {
		return callRemote(send, { p: this.path, a: args });
	}

	get(send: RPCSend, prop: PropertyKey): any {
		return new Proxy(send, new RPCHandler([prop, ...this.path]));
	}
}

/* ============================================================================= *
 *                           Layer 3: Exposed APIs
 * ============================================================================= */

export type PostMessage = (message: object) => void;

export interface PromiseController {

	timer?: ReturnType<typeof setTimeout>;

	resolve(value: unknown): void;

	reject(reason: unknown): void;
}

export interface ReqResWrapper {

	request(message: object): Promise<any>;

	dispatch(message: object): void;

	txMap: Map<number, PromiseController>;
}

/**
 * Wrap publish-subscribe functions to request-response model.
 * The remote service must attach request message id in response message.
 *
 * # NOTE
 * If you disable timeout, there will be a memory leak when response
 * message can't be received.
 *
 * WeakMap doesn't help in this scenario, since the key is deserialized from the message.
 *
 * @example
 * const { request, subscribe } = pubSub2ReqRes(window.postMessage);
 * window.addEventListener("message", e => subscribe(e.data));
 * const response = await request({ text: "Hello" });
 *
 * @param publish The publish message function
 * @param timeout The number of milliseconds to wait for response,
 * 				  set to zero & negative value to disable timeout.
 */
export function pubSub2ReqRes(publish: PostMessage, timeout = 10e3) {
	const txMap = new Map<number, PromiseController>();

	function expire(id: number) {
		const session = txMap.get(id);
		if (session) {
			txMap.delete(id);
			session.reject(new AbortError("Timed out"));
		}
	}

	function request(message: any) {
		const s = message.s = uniqueId();
		publish(message);

		let timer: ReturnType<typeof setTimeout>;
		if (timeout > 0) {
			timer = setTimeout(expire, timeout, s);

			if (typeof window === "undefined")
				timer.unref();
		}

		return new Promise((resolve, reject) => {
			txMap.set(s, { resolve, reject, timer });
		});
	}

	function dispatch(message: any) {
		const session = txMap.get(message.s);
		if (session) {
			clearTimeout(session.timer);
			txMap.delete(message.s);
			session.resolve(message);
		}
	}

	return { txMap, request, dispatch } as ReqResWrapper;
}

export function createClient<T = any>(connection: RPCSend) {
	return new Proxy(connection, new RPCHandler([])) as Remote<T>;
}

export function createServer(controller: object): RPCReceive {
	return (message, respond) => serve(controller, message, respond);
}
