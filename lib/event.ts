type Handler<T extends any[]> = (...args: T) => void;

/**
 * 一个最简单的单事件 EventEmitter 实现，适用于少量并确定的事件。
 */
export class SingleEventEmitter<T extends any[] = any[]> {

	private readonly handlers: Array<Handler<T>> = [];

	addListener(handler: Handler<T>) {
		this.handlers.push(handler);
	}

	removeListener(handler: Handler<T>) {
		const { handlers } = this;
		const i = handlers.indexOf(handler);
		if (i >= 0) {
			handlers.splice(i, 1);
		}
	}

	removeAllListeners() {
		this.handlers.length = 0;
	}

	dispatchEvent(...args: T) {
		for (const fn of this.handlers) fn(...args);
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
		const { events } = this;
		const handlers = events[name];

		if (!handlers) {
			return;
		}

		const i = handlers.indexOf(handler);
		if (i >= 0) {
			handlers.splice(i, 1);

			if (handlers.length === 0) {
				delete events[name];
			}
		}
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
		for (const fn of handlers ?? []) fn(...args);
	}
}

// TODO: once
