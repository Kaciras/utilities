/*
 * 提供在内容脚本和后台脚本间简单的 RPC 功能。
 *
 * 主要参考了 Comlink，而且它有 PR 提出了这一功能，但过了两年也没有合并。
 * https://github.com/GoogleChromeLabs/comlink/pull/414
 *
 * 这种功能也不难，于是就自己写了，顺便也能深入理解下 Comlink 的设计。
 */
import { AbortError, uniqueId } from "./misc.js";

/* ============================================================================= *
 *                         Layer 1：Message protocol
 * ============================================================================= */

export type SendResponse = (resp: ResponseMessage) => void;

export type RPCSend = (message: RequestMessage) => Promise<ResponseMessage>;

export type RPCReceive = (message: RequestMessage, respond: SendResponse) => void;

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

/**
 * 发送消息并拆封返响应，返回结果或抛出异常。
 *
 * @param sendFn 发送消息的函数
 * @param message 要发送的消息
 */
async function callRemote(sendFn: RPCSend, message: RequestMessage) {
	const response = await sendFn(message);
	if (response.isError) {
		throw response.value;
	} else {
		return response.value as unknown;
	}
}

/**
 * 处理收到的消息，调用指定的方法。
 *
 * @param target 服务提供对象
 * @param message 消息
 * @param response 发送响应的函数
 */
function handleMessage(target: any, message: RequestMessage, response: SendResponse) {
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

type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

// eslint-disable-next-line @typescript-eslint/ban-types
type RemoteProperty<T> = T extends Function ? Remote<T> : T;

export type RemoteObject<T> = {
	[P in keyof T]: RemoteProperty<T[P]>;
};

type RemoteCallable<T> = T extends (...args: infer Args) => infer R
	? (...args: { [I in keyof Args]: Args[I] }) => Promisify<Awaited<R>> : unknown;

export type Remote<T> = RemoteObject<T> & RemoteCallable<T>;

/**
 * 代理操作的处理器，比 Comlink 的简单不少。
 *
 * 目前不支持 set 功能，因为赋值操作是同步的，但远程调用都是异步的。
 */
class RPCHandler implements ProxyHandler<RPCSend> {

	/**
	 * Reversed keys for current property, e.g.
	 * 
	 * .foo.bar[0] => [0, "bar", "foo"]
	 */
	private readonly path: PropertyKey[];

	constructor(path: PropertyKey[]) {
		this.path = path;
	}

	/**
	 * 调用远程提供的方法，返回异步的结果。
	 *
	 * @param send 发送消息的函数
	 * @param thisArg 没有用，因为调用时的 this 指向的的代理对象
	 * @param args 参数
	 */
	apply(send: RPCSend, thisArg: any, args: any[]) {
		return callRemote(send, { path: this.path, args });
	}

	/**
	 * 与 Comlink 不同的是本模块不支持直接取值，因为会跟嵌套的代理对象冲突。
	 *
	 * 对此情况 Comlink 的解决方案是让代理对象使用 Comlink.proxy() 包装，
	 * 给其加一个 [proxyMarker] 标记以作区分。
	 *
	 * 因为需要远程通信，取值是异步的要返回 Promise，调用方必须要等待，
	 * 其用法只能是 `sum = (await remote.a) + (await remote.b)` 的形式很啰嗦，同时也违反直觉。
	 * 一些直接赋值语句也无法使用比如 `remote.a++`.
	 *
	 * 我认为这属于过度设计，不如就用 `getXXX` 方法来取值。
	 *
	 * @param send 发送消息的函数
	 * @param prop 要获取的成员名字
	 * @return 新的代理对象，对应到远端相应的成员
	 */
	get(send: RPCSend, prop: PropertyKey): any {
		return new Proxy(send, new RPCHandler([prop, ...this.path]));
	}
}

/* ============================================================================= *
 *                           Layer 3: Exposed APIs
 * ============================================================================= */

export type PoseMessage = (message: object) => void;

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
export function pubSub2ReqRes(publish: PoseMessage, timeout = 5000) {
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

	function subscribe(msg: any) {
		const session = txMap.get(msg.id);
		if (session) {
			clearTimeout(session.timer);
			txMap.delete(msg.id);
			session.resolve(msg);
		}
	}

	return { txMap, request, subscribe } as ReqResWrapper;
}

export function createRPCClient<T = any>(connection: RPCSend) {
	return new Proxy(connection, new RPCHandler([])) as Remote<T>;
}

export function createRPCServer(addListener: RPCReceiver, controller: object) {
	addListener((message, respond) => handleMessage(controller, message, respond));
}
