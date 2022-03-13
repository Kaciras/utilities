type Handler = (...args: any[]) => void;

export class SingleEventEmitter<T extends Handler = any> {

	private handlers: T[] = [];

	addListener(handler: T) {
		this.handlers.push(handler);
	}

	removeListener(handler: T) {
		const { handlers } = this;
		this.handlers = handlers.filter(h => h !== handler);
	}

	removeAllListeners() {
		this.handlers.length = 0;
	}

	once(handler: T) {
		const wrapper = (...args: unknown[]) => {
			handler(...args);
			this.removeListener(wrapper as T);
		};
		this.addListener(wrapper as T);
	}

	dispatchEvent(...args: Parameters<T>) {
		for (const handler of this.handlers) handler(...args);
	}
}

type EventsMap = Record<string, any>;

type HandlerMap<T extends EventsMap> = Partial<{
	[K in keyof T]: Array<T[K]>;
}>;

interface Default extends EventsMap {
	[event: string]: (...args: any) => void;
}

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
