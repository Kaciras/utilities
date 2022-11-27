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

export type Respond = (resp: ResponseMessage) => void;

export type RPCSend = (message: RequestMessage) => Promise<ResponseMessage>;

export type RPCReceive = (message: RequestMessage, respond: Respond) => void;

export type RPCReceiver = (receive: RPCReceive) => void;

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

async function callRemote(send: RPCSend, message: RequestMessage) {
	const response = await send(message);
	if (response.isError) {
		throw response.value;
	} else {
		return response.value as unknown;
	}
}

/**
 * Handle client RPC request, call specific method in the target, and send the response.
 *
 * @param target The service object contains methods that client can use.
 * @param message RPC request message
 * @param respond The function to send the response message.
 */
function handleMessage(target: any, message: RequestMessage, respond: Respond) {
	const { id, path, args } = message;
	try {
		for (let i = path.length - 1; i > 0; i--) {
			target = target[path[i]];
		}
		Promise.resolve(target[path[0]](...args))
			.then(value => response({ id, value, isError: false }))
			.catch(value => response({ id, value, isError: true }));
	} catch (e) {
		return response({ id, value: e, isError: true });
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
		return callRemote(send, { _rpc_in_: 0, path: this.path, args });
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

	timer: ReturnType<typeof setTimeout>;

	resolve(value: unknown): void;

	reject(reason: unknown): void;
}

export interface ReqResWrapper {

	request(message: object): Promise<any>;

	subscribe(message: object): void;

	txMap: Map<number, PromiseController>;
}

/**
 * Wrap publish-subscribe functions to request-response model.
 * The remote service must attach request message id in response message.
 *
 * @example
 * const { request, subscribe } = pubSub2ReqRes(window.postMessage);
 * window.addEventListener("message", e => subscribe(e.data));
 * const response = await request({ text: "Hello" });
 *
 * @param publish The publish message function
 * @param timeout The number of milliseconds to wait for response.
 */
export function pubSub2ReqRes(publish: PostMessage, timeout = 5000) {
	const txMap = new Map<number, PromiseController>();

	function onTimeout(id: number) {
		const session = txMap.get(id);
		if (session) {
			txMap.delete(id);
			session.reject(new AbortError("Timed out"));
		}
	}

	function request(msg: any) {
		const id = msg.id = uniqueId();
		publish(msg);
		const timer = setTimeout(onTimeout, timeout, id);
		return new Promise((resolve, reject) => {
			txMap.set(id, { resolve, reject, timer });
		});
	}

	function dispatch(msg: any) {
		const session = txMap.get(msg.id);
		if (session) {
			clearTimeout(session.timer);
			txMap.delete(msg.id);
			session.resolve(msg);
		}
	}

	return { txMap, request, dispatch } as ReqResWrapper;
}

export function createRPCClient<T = any>(connection: RPCSend) {
	return new Proxy(connection, new RPCHandler([])) as Remote<T>;
}

export function createRPCServer(addListener: RPCReceiver, controller: object) {
	addListener((message, respond) => handleMessage(controller, message, respond));
}
