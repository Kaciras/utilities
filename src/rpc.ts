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
import { Awaitable, noop } from "./lang.js";

/* ============================================================================= *\
 *                              Message Processing
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
	a: unknown[];		// arguments
	p: PropertyKey[];	// path
	s?: number;			// session id
}

export type ResponseMessage = ({
	v: unknown;			// value
} | {
	e: unknown;			// error
}) & {
	r?: number;			// session id
};

export type Publish = PostMessage<RequestMessage>;

export type Respond = PostMessage<ResponseMessage>;

export type Communicate = (message: RequestMessage, transfer: Transferable[]) => Awaitable<ResponseMessage>;

export type SendFn = Publish | Communicate;

async function invoke(send: SendFn, path: PropertyKey[], args: unknown[]) {
	const transfers: Transferable[] = [];
	for (const arg of args) {
		const ts = transferCache.get(arg);
		if (ts) {
			transfers.push(...ts);
		}
	}
	const response = await send({ p: path, a: args }, transfers);
	if (response) {
		if ("e" in response) throw response.e; else return response.v;
	}
}

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
 * };
 *
 * const server = http.createServer((req, res) => {
 * 		consumers.json(req)
 * 			.then(msg => RPC.serve(functions, msg))
 * 			.then(d => res.end(JSON.stringify(d[0])));
 * });
 *
 * server.listen(9789);
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
			{ r: s, v },
			transferCache.get(v) ?? [],
		];
	} catch (e) {
		return [{ r: s, e }, []] as ServeResultTuple;
	}
}

/**
 * A simple wrapper for `RPC.serve`, used to serve requests with
 * publish-subscribe channel.
 *
 * @example
 * // Serve RPC requests in web worker.
 * import { RPC } from "@kaciras/utilities/browser";
 *
 * const functions = {
 * 	hello: (name: string) => `Hello ${name}!`,
 * };
 *
 * const handle = RPC.createServer(functions, (msg, transfer) => {
 * 	self.postMessage(msg, { transfer });
 * });
 * self.addEventListener("message", msg => handle(msg.data));
 */
export function createServer(target: any, respond: Respond = noop) {
	return async (message: RequestMessage) => {
		if (Array.isArray(message.p)) {
			await respond(...await serve(target, message));
		}
	};
}

/* ============================================================================= *
 *                                High level API
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

// --------------- Remote for one-direction communication -------------

export type VoidRemote<T> = {
	[P in keyof T]: VoidRemoteProperty<T[P]>;
}

type VoidRemoteProperty<T> =
// eslint-disable-next-line @typescript-eslint/ban-types
	T extends Function ? VoidCallable<T>
		: T extends object ? VoidRemote<T> : T;

type VoidCallable<T> = T extends (...args: infer A) => any
	? (...args: A) => Promise<void> : unknown;


class RPCHandler implements ProxyHandler<SendFn> {

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

	async apply(send: SendFn, _: unknown, args: any[]) {
		return invoke(send, this.path, args);
	}

	get(send: SendFn, key: PropertyKey): any {
		return new Proxy(send, new RPCHandler([key, ...this.path]));
	}
}

export type Listen = (callback: (message: ResponseMessage) => void) => void;

/*
 * You can choose the client to receive the return value of the server,
 * or just send the call request, depending on the implementation of the send function.
 */

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
export function createClient<T = any>(send: Communicate): Remote<T>;

/**
 * Create an RPC client with publish-subscribe channel.
 *
 * @example
 * // create RPC client with a web worker.
 * import { RPC } from "@kaciras/utilities/browser";
 *
 * const worker = new Worker("/worker.js");
 * const post = worker.postMessage.bind(worker);
 * const client = RPC.createClient(post, callback => {
 * 	worker.onmessage = e => callback(e.data);
 * });
 *
 * @param send Function to post request message.
 * @param listen Listener to receive response message.
 */
export function createClient<T = any>(send: Publish, listen: Listen): Remote<T>;

/**
 * Create an RPC client with one-way message sender.
 *
 * In this case the client cannot receive results of remote functions, returned
 * promise of methods are resolved after message sent.
 *
 * @example
 * import { RPC } from "@kaciras/utilities/browser";
 * const client = RPC.createClient(process.send);
 *
 * // call remote function, but not care the result.
 * await client.hello("world");
 */
export function createClient<T = any>(send: Publish): VoidRemote<T>;

export function createClient(sender: SendFn, listen?: Listen) {
	if (listen) {
		const { request, receive } = pubSub2ReqRes(sender);
		sender = request;
		listen(receive);
	}
	return new Proxy(sender, new RPCHandler([]));
}

/* ============================================================================= *
 *                              Helper Functions
 * ============================================================================= */

function probeSend(obj: any): PostMessage<unknown> {
	if ("send" in obj) {
		return message => obj.send(message);
	} else if ("postMessage" in obj) {
		return obj.postMessage.bind(obj);
	} else if ("emit" in obj) {
		return obj.emit.bind(obj, "message");
	} else {
		throw new TypeError("Can't find send method");
	}
}

function probeReceive(obj: any, callback: any) {
	if ("addEventListener" in obj) {
		obj.addEventListener("message", (e: any) => callback(e.data));
	} else if ("on" in obj) {
		obj.on("message", callback);
	} else {
		throw new TypeError("Can't find response listener");
	}
}

export function domServer(target: any, obj: any) {
	const publish = probeSend(obj);
	probeReceive(obj, createServer(target, publish));
}

export function domClient<T = any>(sender: object, receiver?: object): Remote<T>;

export function domClient<T = any>(sender: object, receiver: false): VoidRemote<T>;

export function domClient<T = any>(sender: any, receiver = sender) {
	const publish = probeSend(sender);
	if (receiver === false) {
		return createClient<T>(publish);
	}
	const { request, receive } = pubSub2ReqRes(publish);
	probeReceive(receiver, receive);
	return createClient<T>(request) as unknown as Remote<T>;
}
