import { describe, expect, it, jest } from "@jest/globals";
import { noop } from "../src/lang.js";
import { MultiEventEmitter, SingleEventEmitter } from "../src/event.js";

describe("SingleEventEmitter", () => {
	const handler1 = jest.fn();
	const handler2 = jest.fn();

	it("should call listeners", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11, 22);
		emitter.dispatchEvent(33);

		for (const h of [handler1, handler2]) {
			expect(h).toHaveBeenCalledTimes(2);
			expect(h).toHaveBeenNthCalledWith(1, 11, 22);
			expect(h).toHaveBeenNthCalledWith(2, 33);
		}
	});

	it("should unbinds listener", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11, 22);
		emitter.removeListener(handler1);
		emitter.dispatchEvent(33);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should auto remove on once", () => {
		const emitter = new SingleEventEmitter();
		emitter.once(handler1);
		emitter.addListener(handler2);

		emitter.dispatchEvent(11);
		emitter.dispatchEvent(22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11);
		expect(handler2).toHaveBeenNthCalledWith(2, 22);
	});

	it("should remove all listeners", () => {
		const emitter = new SingleEventEmitter();
		emitter.addListener(handler1);
		emitter.addListener(() => emitter.removeAllListeners());
		emitter.addListener(handler2);

		emitter.dispatchEvent(11);
		emitter.dispatchEvent(22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenNthCalledWith(1, 11);
	});
});

interface EventTypes {
	foo: (...values: number[]) => void;

	bar(...values: number[]): void;
}

describe("MultiEventEmitter", () => {
	const handler1 = jest.fn();
	const handler2 = jest.fn();

	it("should ok for dispatch event without listeners", () => {
		const emitter = new MultiEventEmitter();
		emitter.dispatchEvent("foo", 11);
	});

	it("should call listeners", () => {
		const emitter = new MultiEventEmitter();
		emitter.addListener("foo", handler1);
		emitter.addListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("foo", 22);
		emitter.dispatchEvent("bar", 33);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);
		expect(handler1).toHaveBeenNthCalledWith(2, 22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenNthCalledWith(1, 33);
	});

	it("should auto remove on once", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.once("foo", handler1);
		emitter.addListener("foo", handler2);
		emitter.once("bar", handler1);

		emitter.dispatchEvent("foo", 11, 22);
		emitter.dispatchEvent("foo", 33);
		emitter.dispatchEvent("bar", 44);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler1).toHaveBeenNthCalledWith(2, 44);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should ok for clear empty listener list", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.removeAllListeners();
		emitter.removeAllListeners("foo");
	});

	it("should ok for remove non exists listener", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.removeListener("foo", noop);
	});

	it("should remove the listener", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", handler1);
		emitter.addListener("foo", handler2);
		emitter.addListener("bar", handler1);

		emitter.removeListener("foo", handler1);
		emitter.removeListener("foo", handler1);
		emitter.removeListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenCalledWith(22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledWith(11);
	});

	it("should not leave empty listener array", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", handler1);
		emitter.removeListener("foo", handler1);

		expect(Object.entries((emitter as any).events)).toHaveLength(0);
	});

	it("should remove all listeners for specific event", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", () => emitter.removeAllListeners("foo"));
		emitter.addListener("foo", handler1);
		emitter.addListener("bar", handler2);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("foo", 22);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	it("should remove all listeners", () => {
		const emitter = new MultiEventEmitter<EventTypes>();
		emitter.addListener("foo", () => emitter.removeAllListeners());
		emitter.addListener("bar", handler1);

		emitter.dispatchEvent("foo", 11);
		emitter.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(0);
	});
});
