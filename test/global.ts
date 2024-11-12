import { expect } from "@jest/globals";
import { uniqueId } from "../src/misc.ts";

class StubError extends Error {

	constructor(id: number) {
		super("This is a stub error - " + id);
	}

	/**
	 * Get a new error for assertion, each error
	 * are unique for expect().toThrow().
	 *
	 * @example
	 * const errorA = Stubs.error.new();
	 * const errorB = Stubs.error.new();
	 *
	 * const fn = jest.fn().mockRejectedValue(errorA);
	 *
	 * // Failed, errorA is not equal to errorB.
	 * await expect(fn()).rejects.toThrow(errorB);
	 */
	new() {
		return new StubError(uniqueId());
	}
}

export const Stubs = Object.freeze({
	/**
	 * An error object can be used to exception test.
	 *
	 * @example
	 * const fn = jest.fn().mockRejectedValue(Stubs.error);
	 * await expect(fn()).rejects.toThrow(Stubs.error);
	 */
	error: new StubError(0),
});

export function assertListEquals(actual?: Iterable<any>, expected?: any[]) {
	expect([...actual!]).toStrictEqual(expected);
}
