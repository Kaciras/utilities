import { noop } from "./lang.ts";
import { firstItem } from "./collection.ts";

type Dispose<T> = (value: T) => unknown;

export interface LRUCacheOptions<T> {
	/**
	 * The max time in millisecond to store items.
	 *
	 * @default Infinity
	 */
	ttl?: number;

	/**
	 * The max number of items to keep in the cache.
	 *
	 * @default Infinity
	 */
	capacity?: number;

	/**
	 * Method called when an item is removed from the cache
	 */
	dispose?: Dispose<T>;
}

interface CacheEntry<T> {
	value: T;
	timer?: NodeJS.Timeout;
}

/**
 * A cache object support Least-Recently-Used and Time-To-Live elimination.
 *
 * # Alternatives
 * [lru-cache](https://github.com/isaacs/node-lru-cache)
 * [Mnemonist is a curated collection of data structures](https://github.com/yomguithereal/mnemonist)
 * [quick-lru](https://github.com/sindresorhus/quick-lru)
 */
export default class LRUCache<K, T> {

	private readonly map = new Map<K, CacheEntry<T>>();

	private readonly ttl: number;
	private readonly dispose: Dispose<T>;
	private readonly capacity: number;

	constructor(options: LRUCacheOptions<T> = {}) {
		this.ttl = options.ttl ?? Infinity;
		this.capacity = options.capacity ?? Infinity;
		this.dispose = options.dispose ?? noop;
	}

	/**
	 * The number of items in the cache.
	 */
	get size() {
		return this.map.size;
	}

	/**
	 * Get an item stored in the cache.
	 * Returns undefined if the item is not in the cache.
	 */
	get(key: K) {
		const e = this.map.get(key);
		if (e) {
			this.updateOrder(key, e);
			this.refreshTimeout(key, e);
			return e.value;
		}
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

	/**
	 * Delete all items from the cache.
	 *
	 * It's recommend to call this method when you no longer need the cache,
	 * if the TTL is set.
	 *
	 * @param dispose override defaults on the constructor.
	 */
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

	/*
	 * Map iteration always starts with the oldest element,
	 * so we use this for cache eviction.
	 */
	private pruneIfNeeded() {
		if (this.size <= this.capacity) {
			return;
		}
		// noinspection LoopStatementThatDoesntLoopJS
		const [key, e] = firstItem(this.map)!;
		this.map.delete(key);
		this.dispose(e.value);
		return clearTimeout(e.timer);
	}

	* [Symbol.iterator]() {
		for (const [key, e] of this.map) yield [key, e.value];
	}

	keys() {
		return this.map.keys();
	}

	* values() {
		for (const e of this.map.values()) yield e.value;
	}
}
