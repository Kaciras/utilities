import { AbortError, uniqueId } from "./misc.ts";

/*
 * There 2 syntax can be used for declare types of event map:
 * ① SingleEventEmitter<[number, string]>
 * ② SingleEventEmitter<(foo: number, bar: string) => void>
 *
 * The ② supports specific parameter names, but it has a redundant return type,
 * and parameter names are not always needed, so we choose the simpler ①.
 */

type Handler<T, A extends any[]> = (this: T, ...args: A) => unknown;

/**
 * Event dispatcher for only one type of event.
 *
 * Listeners are called synchronously in the order in which
 * they were registered.
 */
export class SingleEventEmitter<A extends any[] = any[]> {

	private handlers: Array<Handler<this, A>> = [];

	addListener(handler: Handler<this, A>) {
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
	removeListener(handler: Handler<this, A>) {
		const { handlers } = this;
		this.handlers = handlers.filter(h => h !== handler);
	}

	removeAllListeners() {
		this.handlers = [];
	}

	once(handler: Handler<this, A>) {
		const wrapper = (...args: A) => {
			handler.apply(this, args);
			this.removeListener(wrapper);
		};
		this.addListener(wrapper as Handler<this, A>);
	}

	dispatchEvent(...args: A) {
		for (const handler of this.handlers) handler.apply(this, args);
	}
}

/** Event name with its arguments */
type EventMap = Record<never, any[]>;

interface Default extends EventMap {
	[event: string]: any[];
}

type HandlerMap<T, A extends EventMap> = {
	[K in keyof A]?: Array<Handler<T, A[K]>>;
}

/**
 * Emit multiple type events and may have listeners for them.
 *
 * # Alternatives
 * [nanoevents](https://github.com/ai/nanoevents).
 *
 * In Node, you can import EventEmitter from "event" instead.
 */
export class MultiEventEmitter<T extends EventMap = Default> {

	private events: HandlerMap<this, T> = Object.create(null);

	addListener<K extends keyof T>(name: K, handler: Handler<this, T[K]>) {
		(this.events[name] ??= []).push(handler);
	}

	removeListener<K extends keyof T>(name: K, handler: Handler<this, T[K]>) {
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

	once<K extends keyof T>(name: K, handler: Handler<this, T[K]>) {
		const wrapper = (...args: T[K]) => {
			handler.apply(this, args);
			this.removeListener(name, wrapper);
		};
		this.addListener(name, wrapper as Handler<this, T[K]>);
	}

	dispatchEvent<K extends keyof T>(name: K, ...args: T[K]) {
		const handlers = this.events[name];
		for (const handler of handlers ?? []) handler.apply(this, args);
	}
}

/**
 * Sends a message. If the function return a Promise, it should be awaited.
 */
export type PostMessage<T = any> = (message: T, transfer: Transferable[]) => void;

export interface PromiseController<T = unknown> {

	timer?: ReturnType<typeof setTimeout>;

	resolve(value: T): void;

	reject(reason: unknown): void;
}

export interface RequestResponseWrapper<T, R> {

	txMap: Map<number, PromiseController<R>>;

	receive(message: R): void;

	request(message: T, transfer?: Transferable[]): Promise<R>;
}

// Session id will be set as the `s` property in requests.
type ReqIdMixin = object & { s?: number };

// Server must pass the id back via the `r` property.
type ResIdMixin = object & { r?: number };

/**
 * Wrap publish-subscribe functions to request-response model.
 *
 * # NOTE
 * If you disable timeout, there will be a memory leak when response
 * message can't be received. WeakMap doesn't help in this scenario,
 * since the key is deserialized from the message.
 *
 * @example
 * const { request, receive } = pubSub2ReqRes(window.postMessage);
 * window.addEventListener("message", e => receive(e.data));
 * const response = await request({ text: "Hello" });
 *
 * @param publish The publish message function
 * @param timeout The number of milliseconds to wait for response,
 * 				  set to zero or negative value to disable timeout.
 */
export function pubSub2ReqRes<
	T extends ReqIdMixin = any,
	R extends ResIdMixin = any,
>(publish: PostMessage<T>, timeout = 10e3) {
	const txMap = new Map<number, PromiseController>();

	function receive(message: R) {
		const session = txMap.get(message.r!);
		if (session) {
			session.resolve(message);
			txMap.delete(message.r!);
			clearTimeout(session.timer);
		}
	}

	async function request(message: T, transfer: Transferable[] = []) {
		const s = message.s = uniqueId();

		let timer: ReturnType<typeof setTimeout>;
		if (timeout > 0) {
			timer = setTimeout(expire, timeout, s);

			if (typeof window === "undefined") {
				timer.unref();
			}
		}

		const response = new Promise((resolve, reject) => {
			txMap.set(s, { resolve, reject, timer });
		});

		try {
			await publish(message, transfer);
			return response;
		} catch (publishError) {
			txMap.delete(s);
			clearTimeout(timer!);
			throw publishError;
		}
	}

	function expire(sessionId: number) {
		const tx = txMap.get(sessionId);
		if (tx) {
			txMap.delete(sessionId);
			tx.reject(new AbortError("Timed out"));
		}
	}

	return { txMap, request, receive } as RequestResponseWrapper<T, R>;
}
