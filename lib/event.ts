type Handler<T> = (event: T) => void;

/**
 * 一个最简单的单事件 EventEmitter 实现，适用于少量并确定的事件。
 */
export class SingleEventEmitter<T> {

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

	dispatchEvent(event: T) {
		for (const fn of this.handlers) fn(event);
	}
}

/**
 * 处理器存储，键是事件名值是处理器列表，因为太长所以拿出来了。
 */
type HandlerMap = Record<string, Array<Handler<any>>>;

/**
 * 一个最简单的多事件 EventEmitter 实现，适用于类型不确定的事件。
 */
export class MultiEventEmitter {

	private events: HandlerMap = Object.create(null);

	addListener(name: string, handler: Handler<any>) {
		const { events } = this;
		(events[name] ??= []).push(handler);
	}

	removeListener(name: string, handler: Handler<any>) {
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

	removeAllListeners(name?: string) {
		if (typeof name === "string") {
			delete this.events[name];
		} else {
			this.events = Object.create(null);
		}
	}

	dispatchEvent(name: string, event: any) {
		for (const fn of this.events[name]) fn(event);
	}
}
