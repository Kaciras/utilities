export interface TTLCacheOptions<T> {
	ttl: number;

	dispose?(value: T): unknown;
}

interface CacheEntry<T> {
	value: T;
	timer: NodeJS.Timeout;
}

export default class TTLCache<K, T> {

	private readonly map = new Map<K, CacheEntry<T>>();

	private readonly ttl: number;
	private readonly dispose: (value: T) => unknown;

	constructor(options: TTLCacheOptions<T>) {
		this.ttl = options.ttl;
		this.dispose = options.dispose ?? (() => {});
	}

	private refreshTimeout(key: K, e: CacheEntry<T>) {
		clearTimeout(e.timer);
		const cb = () => {
			this.map.delete(key);
			this.dispose(e.value);
		};
		e.timer = setTimeout(cb, this.ttl).unref();
	}

	get size() {
		return this.map.size;
	}

	get(key: K) {
		const e = this.map.get(key);
		if (!e) {
			return null;
		}
		this.refreshTimeout(key, e);
		return e.value;
	}

	set(key: K, value: T) {
		let e = this.map.get(key);
		if (e) {
			this.dispose(e.value);
			e.value = value;
		} else {
			e = { value } as CacheEntry<T>;
			this.map.set(key, e);
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

	clear(dispose?: (value: T) => unknown) {
		for (const e of this.map.values()) {
			clearTimeout(e.timer);
			(dispose ?? this.dispose)(e.value);
		}
		this.map.clear();
	}

	* values() {
		for (const e of this.map.values()) yield e.value;
	}
}
