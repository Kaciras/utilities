// noinspection LoopStatementThatDoesntLoopJS

type Dispose<T> = (value: T) => unknown;

export interface TTLCacheOptions<T> {
	ttl?: number;
	capacity?: number;
	dispose?: Dispose<T>;
}

interface CacheEntry<T> {
	value: T;
	timer?: NodeJS.Timeout;
}

export default class TTLCache<K, T> {

	private readonly map = new Map<K, CacheEntry<T>>();

	private readonly ttl: number;
	private readonly dispose: Dispose<T>;
	private readonly capacity: number;

	constructor(options: TTLCacheOptions<T> = {}) {
		this.ttl = options.ttl ?? Infinity;
		this.capacity = options.capacity ?? Infinity;
		this.dispose = options.dispose ?? (() => {});
	}

	get size() {
		return this.map.size;
	}

	get(key: K) {
		const e = this.map.get(key);
		if (!e) {
			return null;
		}
		this.updateOrder(key, e);
		this.refreshTimeout(key, e);
		return e.value;
	}

	set(key: K, value: T) {
		let e = this.map.get(key);
		if (e) {
			this.dispose(e.value);
			e.value = value;
			this.updateOrder(key, e);
		} else {
			e = { value };
			this.map.set(key, e);
			this.pruneIfNeeded();
		}
		this.refreshTimeout(key, e);
	}

	delete(key: K) {
		const e = this.map.get(key);
		if (!e) {
			return;
		}
		this.map.delete(key);
		clearTimeout(e.timer);
		this.dispose(e.value);
	}

	clear(dispose?: Dispose<T>) {
		dispose ??= this.dispose;
		for (const e of this.map.values()) {
			dispose(e.value);
			clearTimeout(e.timer);
		}
		this.map.clear();
	}

	private refreshTimeout(key: K, e: CacheEntry<T>) {
		const { ttl, map, dispose } = this;
		if (ttl === Infinity) {
			return;
		}
		clearTimeout(e.timer);
		const cb = () => {
			map.delete(key);
			dispose(e.value);
		};
		(e.timer = setTimeout(cb, ttl)).unref?.();
	}

	private updateOrder(key: K, e: CacheEntry<T>) {
		this.map.delete(key);
		this.map.set(key, e);
	}

	private pruneIfNeeded() {
		if (this.size <= this.capacity) {
			return;
		}
		for (const [key, e] of this.map) {
			this.map.delete(key);
			this.dispose(e.value);
			return clearTimeout(e.timer);
		}
	}

	*[Symbol.iterator]() {
		for (const [key, e] of this.map) yield [key, e.value];
	}

	keys() {
		return this.map.keys();
	}

	* values() {
		for (const e of this.map.values()) yield e.value;
	}
}
