import { AbortError, uniqueId } from "./misc.js";

type Handler<T extends any[]> = (...args: T) => any;

/**
 * Event dispatcher for only one type of event.
 *
 * Listeners are called synchronously in the order in which
 * they were registered.
 */
export class SingleEventEmitter<T extends any[] = any[]> {

	private handlers: Array<Handler<T>> = [];

	addListener(handler: Handler<T>) {
		this.handlers.push(handler);
	}

	/**
	 * Removes the specified listener from the listener array.
	 *
	 * Once an event is emitted, all listeners attached to it
	 * at the time of emitting are called in order.
	 * This implies that any removeListener() or removeAllListeners()
	 * calls after emitting and before the last listener
	 * finishes execution will not remove them from emit() in progress.
	 *
	 * @param handler The listener to remove
	 */
	removeListener(handler: Handler<T>) {
		const { handlers } = this;
		this.handlers = handlers.filter(h => h !== handler);
	}

	removeAllListeners() {
		this.handlers = [];
	}

	once(handler: Handler<T>) {
		const wrapper = (...args: T) => {
			handler(...args);
			this.removeListener(wrapper as Handler<T>);
		};
		this.addListener(wrapper as Handler<T>);
	}

	dispatchEvent(...args: T) {
		for (const handler of this.handlers) handler(...args);
	}
}

type EventsMap = Record<string, any>;

type HandlerMap<T extends EventsMap> = Partial<{
	[K in keyof T]: Array<T[K]>;
}>;

interface Default extends EventsMap {
	[event: string]: (...args: any) => any;
}

/**
 * # Alternatives
 * [nanoevents](https://github.com/ai/nanoevents).
 *
 * In Node, you can import EventEmitter from "event" instead.
 */
export class MultiEventEmitter<T extends EventsMap = Default> {

	private events: HandlerMap<T> = Object.create(null);

	addListener<K extends keyof T>(name: K, handler: T[K]) {
		const { events } = this;
		(events[name] ??= [] as Array<T[K]>).push(handler);
	}

	removeListener<K extends keyof T>(name: K, handler: T[K]) {
		let handlers = this.events[name];
		if (!handlers) {
			return;
		}
		handlers = handlers.filter(h => h !== handler);
		if (handlers.length === 0) {
			delete this.events[name];
		} else {
			this.events[name] = handlers;
		}
	}

	removeAllListeners(name?: keyof T) {
		if (name !== undefined) {
			delete this.events[name];
		} else {
			this.events = Object.create(null);
		}
	}

	once<K extends keyof T>(name: K, handler: T[K]) {
		const wrapper = (...args: unknown[]) => {
			handler(...args);
			this.removeListener(name, wrapper as T[K]);
		};
		this.addListener(name, wrapper as T[K]);
	}

	dispatchEvent<K extends keyof T>(name: K, ...args: Parameters<T[K]>) {
		const handlers = this.events[name];
		for (const handler of handlers ?? []) handler(...args);
	}
}

export type PostMessage<T = any> = (message: T, transfers: Transferable[]) => void;

export interface PromiseController {

	timer?: ReturnType<typeof setTimeout>;

	resolve(value: unknown): void;

	reject(reason: unknown): void;
}

export interface RequestResponseWrapper {

	request(message: object): Promise<any>;

	dispatch(message: object): void;

	txMap: Map<number, PromiseController>;
}

/**
 * Wrap publish-subscribe functions to request-response model.
 * The remote service must attach the id in response message.
 *
 * # NOTE
 * If you disable timeout, there will be a memory leak when response
 * message can't be received. WeakMap doesn't help in this scenario,
 * since the key is deserialized from the message.
 *
 * @example
 * const { request, subscribe } = pubSub2ReqRes("DEMO", window.postMessage);
 * window.addEventListener("message", e => subscribe(e.data));
 * const response = await request({ text: "Hello" });
 *
 * @param publish The publish message function
 * @param timeout The number of milliseconds to wait for response,
 * 				  set to zero or negative value to disable timeout.
 */
export function pubSub2ReqRes(publish: PostMessage, timeout = 10e3) {
	const txMap = new Map<number, PromiseController>();

	function dispatch(message: any) {
		if (typeof message !== "object") {
			return;
		}
		const session = txMap.get(message.s);
		if (session) {
			session.resolve(message);
			txMap.delete(message.s);
			clearTimeout(session.timer);
		}
	}

	function request(message: any, transfers: Transferable[] = []) {
		const s = message.s = uniqueId();
		publish(message, transfers);

		let timer: ReturnType<typeof setTimeout>;
		if (timeout > 0) {
			timer = setTimeout(expire, timeout, s);

			if (typeof window === "undefined") {
				timer.unref();
			}
		}

		return new Promise((resolve, reject) => {
			txMap.set(s, { resolve, reject, timer });
		});
	}

	function expire(sessionId: number) {
		const tx = txMap.get(sessionId);
		if (tx) {
			txMap.delete(sessionId);
			tx.reject(new AbortError("Timed out"));
		}
	}

	return { txMap, request, dispatch } as RequestResponseWrapper;
}
