import { describe, expect, it } from "@jest/globals";
import { NeverAbort, uniqueId } from "../src/misc.ts";

describe("NeverAbort", () => {
	it("should not abort", () => {
		// NeverAbort.throwIfAborted();
		expect(NeverAbort.dispatchEvent).toThrow();
		expect(NeverAbort.aborted).toBe(false);
	});

	it("should ignore listeners", () => {
		NeverAbort.onabort = () => 11;
		NeverAbort.removeEventListener("abort", () => 11);
		NeverAbort.addEventListener("abort", () => 11);

		expect(NeverAbort.onabort).toBeNull();
	});

	it("should throw error on unsupported operation", () => {
		expect(() => NeverAbort.dispatchEvent(new Event("abort"))).toThrow("Not supported");
	});
});

describe("uniqueId", () => {
	it("should generate unique numbers", () => {
		const a = uniqueId();
		const b = uniqueId();

		expect(a).toBeTruthy();
		expect(a).not.toBe(b);
		expect(a).not.toBe(uniqueId());
	});
});
