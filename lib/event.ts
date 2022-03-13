type Handler<T extends any[]> = (...args: T) => void;

/**
 * 一个最简单的单事件 EventEmitter 实现，适用于少量并确定的事件。
 */
export class SingleEventEmitter<T extends any[] = any[]> {

	private handlers: Array<Handler<T>> = [];

	addListener(handler: Handler<T>) {
		this.handlers.push(handler);
	}

	removeListener(handler: Handler<T>) {
		const { handlers } = this;
		this.handlers = handlers.filter(h => h !== handler);
	}

	once(handler: Handler<T>) {
		const wrapper = (...args: T) => {
			handler(...args);
			this.removeListener(wrapper);
		};
		this.addListener(wrapper);
	}

	removeAllListeners() {
		this.handlers.length = 0;
	}

	dispatchEvent(...args: T) {
		for (const handler of this.handlers) handler(...args);
	}
}

type EventsMap = Record<string, any>;

/**
 * 处理器存储，键是事件名值是处理器列表，因为太长所以拿出来了。
 */
type HandlerMap<T extends EventsMap> = Partial<{
	[K in keyof T]: Array<T[K]>;
}>;

interface Default extends EventsMap {
	[event: string]: (...args: any) => void;
}

/**
 * 一个最简单的多事件 EventEmitter 实现，适用于类型不确定的事件。
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

	once<K extends keyof T>(name: K, handler: T[K]) {
		const wrapper = (...args: unknown[]) => {
			handler(...args);
			this.removeListener(name, wrapper as T[K]);
		};
		this.addListener(name, wrapper as T[K]);
	}

	removeAllListeners(name?: keyof T) {
		if (typeof name === "string") {
			delete this.events[name];
		} else {
			this.events = Object.create(null);
		}
	}

	dispatchEvent<K extends keyof T>(name: K, ...args: Parameters<T[K]>) {
		const handlers = this.events[name];
		for (const handler of handlers ?? []) handler(...args);
	}
}
