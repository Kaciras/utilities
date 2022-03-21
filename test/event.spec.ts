import { describe, it, expect, jest } from "@jest/globals";
import { MultiEventEmitter, SingleEventEmitter } from "../lib/event";

describe("SingleEventEmitter", () => {
	const handler1 = jest.fn();
	const handler2 = jest.fn();

	it("should call listeners", () => {
		const events = new SingleEventEmitter();
		events.addListener(handler1);
		events.addListener(handler2);

		events.dispatchEvent(11, 22);
		events.dispatchEvent(33);

		for (const h of [handler1, handler2]) {
			expect(h).toHaveBeenCalledTimes(2);
			expect(h).toHaveBeenNthCalledWith(1, 11, 22);
			expect(h).toHaveBeenNthCalledWith(2, 33);
		}
	});

	it("should unbinds listener", () => {
		const events = new SingleEventEmitter();
		events.addListener(handler1);
		events.addListener(handler2);

		events.dispatchEvent(11, 22);
		events.removeListener(handler1);
		events.dispatchEvent(33);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should auto remove on once", () => {
		const events = new SingleEventEmitter();
		events.once(handler1);
		events.addListener(handler2);

		events.dispatchEvent(11);
		events.dispatchEvent(22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11);
		expect(handler2).toHaveBeenNthCalledWith(2, 22);
	});

	it("should remove all listeners", () => {
		const events = new SingleEventEmitter();
		events.addListener(handler1);
		events.addListener(() => events.removeAllListeners());
		events.addListener(handler2);

		events.dispatchEvent(11);
		events.dispatchEvent(22);

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

	it("should call listeners", () => {
		const events = new MultiEventEmitter();
		events.addListener("foo", handler1);
		events.addListener("bar", handler2);

		events.dispatchEvent("foo", 11);
		events.dispatchEvent("foo", 22);
		events.dispatchEvent("bar", 33);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11);
		expect(handler1).toHaveBeenNthCalledWith(2, 22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenNthCalledWith(1, 33);
	});

	it("should auto remove on once", () => {
		const events = new MultiEventEmitter<EventTypes>();
		events.once("foo", handler1);
		events.addListener("foo", handler2);
		events.once("bar", handler1);

		events.dispatchEvent("foo", 11, 22);
		events.dispatchEvent("foo", 33);
		events.dispatchEvent("bar", 44);

		expect(handler1).toHaveBeenCalledTimes(2);
		expect(handler1).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler1).toHaveBeenNthCalledWith(2, 44);

		expect(handler2).toHaveBeenCalledTimes(2);
		expect(handler2).toHaveBeenNthCalledWith(1, 11, 22);
		expect(handler2).toHaveBeenNthCalledWith(2, 33);
	});

	it("should ok for clear empty listener list", () => {
		const events = new MultiEventEmitter<EventTypes>();
		events.removeAllListeners();
		events.removeAllListeners("foo");
	});

	it("should ok for remove non exists listener", () => {
		const events = new MultiEventEmitter<EventTypes>();
		events.removeListener("foo", () => {});
	});

	it("should remove the listener", () => {
		const events = new MultiEventEmitter<EventTypes>();
		events.addListener("foo", handler1);
		events.addListener("foo", handler2);
		events.addListener("bar", handler1);

		events.removeListener("foo", handler1);
		events.removeListener("foo", handler1);
		events.removeListener("bar", handler2);

		events.dispatchEvent("foo", 11);
		events.dispatchEvent("bar", 22);

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenCalledWith(22);

		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledWith(11);
	});
});
