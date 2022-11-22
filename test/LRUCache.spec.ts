import { beforeEach, expect, it, jest } from "@jest/globals";
import LRUCache from "../lib/LRUCache.js";

jest.useFakeTimers();

beforeEach(jest.clearAllTimers);

it("should have the size property", () => {
	const cache = new LRUCache();
	expect(cache.size).toBe(0);

	cache.set("key", 8964);
	expect(cache.size).toBe(1);
});

it("should got null from empty cache", () => {
	const cache = new LRUCache();
	expect(cache.get("key")).toBeUndefined();
});

it("should get cached value", () => {
	const cache = new LRUCache();
	cache.set("key", 8964);
	expect(cache.get("key")).toBe(8964);
});

it("should expire entries by TTL", () => {
	const cache = new LRUCache({ ttl: 1000 });
	cache.set("key", 8964);

	jest.advanceTimersByTime(800);
	jest.advanceTimersByTime(800);

	expect(cache.size).toBe(0);
	expect(cache.get("key")).toBeUndefined();
});

it("should not expire entries without TTL", () => {
	const cache = new LRUCache();
	cache.set("key", 8964);

	jest.runOnlyPendingTimers();

	expect(cache.get("key")).toBe(8964);
});

it("should refresh expiration time on get", () => {
	const cache = new LRUCache({ ttl: 1000 });
	cache.set("key", 8964);

	jest.advanceTimersByTime(800);
	cache.get("key");

	jest.advanceTimersByTime(800);
	expect(cache.get("key")).toBe(8964);
});

it("should update recent usage on get", () => {
	const cache = new LRUCache({ capacity: 2 });
	cache.set("foo", 111);
	cache.set("bar", 222);

	cache.get("foo");
	cache.set("baz", 333);

	expect(cache.get("bar")).toBeUndefined();
	expect(cache.get("foo")).toBe(111);
});

it("should support override value", () => {
	const cache = new LRUCache({ ttl: 1000 });
	cache.set("key", 8964);
	jest.advanceTimersByTime(800);

	cache.set("key", 114514);
	jest.advanceTimersByTime(800);

	expect(cache.size).toBe(1);
	expect(cache.get("key")).toBe(114514);
});

it("should dispose old value on set", () => {
	const dispose = jest.fn();
	const cache = new LRUCache({ ttl: 1000, dispose });

	cache.set("key", 8964);
	cache.set("key", 114514);

	expect(jest.getTimerCount()).toBe(1);
	expect(dispose).toHaveBeenCalledTimes(1);
	expect(dispose).toHaveBeenCalledWith(8964);
});

it("should update recent usage on set", () => {
	const cache = new LRUCache({ capacity: 2 });
	cache.set("foo", 111);
	cache.set("bar", 222);
	cache.set("foo", 111);

	cache.set("baz", 333);

	expect(cache.get("bar")).toBeUndefined();
	expect(cache.get("foo")).toBe(111);
});

it("should do LRU elimination", () => {
	const dispose = jest.fn();
	const cache = new LRUCache({ ttl: 1000, dispose, capacity: 2 });

	cache.set("foo", 111);
	cache.set("bar", 222);
	cache.set("baz", 333);

	expect(cache.size).toBe(2);
	expect(cache.get("foo")).toBeUndefined();
	expect(cache.get("baz")).toBe(333);

	expect(jest.getTimerCount()).toBe(2);
	expect(dispose).toHaveBeenCalledTimes(1);
	expect(dispose).toHaveBeenCalledWith(111);
});

it("should pass on deleting non exist entry", () => {
	const cache = new LRUCache();
	cache.set("key", 8964);
	cache.delete("another-key");
	expect(cache.get("key")).toBe(8964);
});

it("should delete the entry", () => {
	const cache = new LRUCache();
	cache.set("key", 8964);
	cache.delete("key");
	expect(cache.get("key")).toBeUndefined();
});

it("should dispose the value on delete", () => {
	const dispose = jest.fn();
	const cache = new LRUCache({ dispose });

	cache.set("key", 8964);
	cache.delete("key");

	expect(jest.getTimerCount()).toBe(0);
	expect(dispose).toHaveBeenCalledTimes(1);
	expect(dispose).toHaveBeenCalledWith(8964);
});

it("should clear entries", () => {
	const cache = new LRUCache();
	cache.set("foo", 111);
	cache.set("bar", 222);

	cache.clear();

	expect(cache.size).toBe(0);
	expect(cache.get("foo")).toBeUndefined();
	expect(cache.get("bar")).toBeUndefined();
});

it("should dispose values on clear", () => {
	const dispose = jest.fn();
	const cache = new LRUCache({ ttl: 1000, dispose });
	cache.set("foo", 111);
	cache.set("bar", 222);

	cache.clear();

	expect(jest.getTimerCount()).toBe(0);
	expect(dispose).toHaveBeenCalledTimes(2);
	expect(dispose).toHaveBeenCalledWith(111);
	expect(dispose).toHaveBeenCalledWith(222);
});

it("should use custom dispose function on clear", () => {
	const dispose = jest.fn();
	const dispose2 = jest.fn();
	const cache = new LRUCache({ ttl: 1000, dispose });
	cache.set("foo", 111);
	cache.set("bar", 222);

	cache.clear(dispose2);

	expect(dispose).toHaveBeenCalledTimes(0);
	expect(dispose2).toHaveBeenCalledTimes(2);
	expect(dispose2).toHaveBeenCalledWith(111);
	expect(dispose2).toHaveBeenCalledWith(222);
});

it("should get key iterator", () => {
	const cache = new LRUCache();
	cache.set("foo", 111);
	cache.set("bar", 222);

	expect(Array.from(cache.keys())).toStrictEqual(["foo", "bar"]);
});

it("should get value iterator", () => {
	const cache = new LRUCache();
	cache.set("foo", 111);
	cache.set("bar", 222);

	expect(Array.from(cache.values())).toStrictEqual([111, 222]);
});

it("should get key-value pair iterator", () => {
	const cache = new LRUCache();
	cache.set("foo", 111);
	cache.set("bar", 222);

	expect(Array.from(cache)).toStrictEqual([["foo", 111], ["bar", 222]]);
});
