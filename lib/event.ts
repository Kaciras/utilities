type Handler<T extends any[]> = (...args: T) => any;

/**
 * The SingleEventEmitter calls all listeners synchronously in the
 * order in which they were registered.
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
 * <h2>Alternatives</h2>
 * In Node, you can import EventEmitter from "event" instead.
 *
 *
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
		if (typeof name === "string") {
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
