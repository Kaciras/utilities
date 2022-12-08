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

/* ============================================================================= *
 *                         Layer 1：Message protocol
 * ============================================================================= */

export type Respond = (resp: ResponseMessage, transfer?: Transferable[]) => void;

export type RPCSend = (message: RequestMessage, transfer?: Transferable[]) => Promise<ResponseMessage>;

export type RPCReceive = (message: RequestMessage, respond: Respond) => void;

export interface RequestMessage {
	id?: number;
	args: any[];
	path: PropertyKey[];
}

export interface ResponseMessage {
	id?: number;
	value: any;
	isError: boolean;
}

const transferCache = new WeakMap<any, Transferable[]>();

export function transfer<T>(obj: T, transfers: Transferable[]) {
	transferCache.set(obj, transfers);
	return obj;
}

async function callRemote(send: RPCSend, message: RequestMessage) {
	const transfers: Transferable[] = [];
	for (const arg of message.args) {
		const ts = transferCache.get(arg);
		if (ts) {
			transfers.push(...ts);
		}
	}
	const response = await send(message, transfers);
	if (response.isError) {
		throw response.value;
	} else {
		return response.value as unknown;
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
	const { id, path, args } = message;
	try {
		for (let i = path.length - 1; i > 0; i--) {
			target = target[path[i]];
		}
		const value = await target[path[0]](...args);
		const transfers = transferCache.get(value);
		respond({ id, value, isError: false }, transfers);
	} catch (e) {
		respond({ id, value: e, isError: true }, []);
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
	 * Keys for current property in reversed order, e.g.
	 *
	 * @example
	 * createRPCClient().foo.bar[0] -> [0, "bar", "foo"]
	 */
	private readonly path: PropertyKey[];

	constructor(path: PropertyKey[]) {
		this.path = path;
	}

	apply(send: RPCSend, thisArg: any, args: any[]) {
		return callRemote(send, { path: this.path, args });
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
 * <h2>NOTE</h2>
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
		const id = message.id = uniqueId();
		publish(message);

		let timer: ReturnType<typeof setTimeout>;
		if (timeout > 0) {
			timer = setTimeout(expire, timeout, id);

			if (typeof window === "undefined")
				timer.unref();
		}

		return new Promise((resolve, reject) => {
			txMap.set(id, { resolve, reject, timer });
		});
	}

	function dispatch(message: any) {
		const session = txMap.get(message.id);
		if (session) {
			clearTimeout(session.timer);
			txMap.delete(message.id);
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
