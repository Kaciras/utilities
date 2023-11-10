import { describe, expect, it } from "@jest/globals";
import { alwaysFalse, alwaysTrue, createInstance, identity, silencePromise, silentCall } from "../src/lang.ts";

describe("commonly used functions", () => {
	it("identity", () => {
		expect(identity(1122)).toBe(1122);
	});
	it("alwaysTrue", () => {
		expect(alwaysTrue()).toBe(true);
	});
	it("alwaysFalse", () => {
		expect(alwaysFalse()).toBe(false);
	});
});

describe("silence", () => {
	const returnFn = () => 11;
	const throwFn = () => { throw new Error(); };

	it("should works", () => {
		expect(silentCall(returnFn)).toBe(11);
		expect(silentCall(throwFn)).toBeUndefined();
	});
});

describe("silencePromise", () => {
	it.each([
		new Promise(() => {}),
		undefined,
		8964,
		null,
		silencePromise,
	])("should allow any arguments", arg => {
		return silencePromise(arg);
	});

	it("should works", () => {
		return silencePromise(Promise.reject(new Error("Shouldn't throw")));
	});
});

describe("createInstance", () => {
	const invalidArgs = ["", 11, undefined, true, Symbol()];

	it.each(invalidArgs)("should throw error for invalid parent %s", p => {
		// @ts-expect-error
		expect(() => createInstance(p, 45)).toThrow();
	});

	it("should support null as parent", () => {
		const instance = createInstance(null, { aa: 11 });
		expect(instance.aa).toBe(11);
		expect(Object.getPrototypeOf(instance)).toBeNull();
	});

	it("should set prototype to the parent object", () => {
		const foo = { aa: 11, bb: 22 };
		const instance = createInstance(foo, { aa: 33 });

		expect(instance.aa).toBe(33);
		expect(instance.bb).toBe(22);
	});

	it("should set prototype to the parent class", () => {
		class Foo {
			aa() { return 11; }

			bb() { return 22; }
		}

		const instance = createInstance(Foo, { aa() { return 33;} });

		expect(instance.aa()).toBe(33);
		expect(instance.bb()).toBe(22);
	});
});
