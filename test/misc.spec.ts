import { performance } from "perf_hooks";
import { describe, expect, it } from "@jest/globals";
import { NeverAbort, sleep, uniqueId } from "../lib/misc";

describe("NeverAbort", () => {
	it("should not abort", () => {
		expect(NeverAbort.aborted).toBe(false);
		expect(NeverAbort.dispatchEvent).toThrow();
	});

	it("should ignore listeners", () => {
		NeverAbort.onabort = () => 11;
		NeverAbort.removeEventListener("abort", () => 11);
		NeverAbort.addEventListener("abort", () => 11);

		expect(NeverAbort.onabort).toBeNull();
	});
});

describe("uniqueId", () => {
	it("should generate unique numbers", () => {
		const a = uniqueId();
		const b = uniqueId();

		expect(a).not.toBe(b);
		expect(a).not.toBe(uniqueId());
	});
});

describe("sleep", () => {
	it("should fulfill after the time", async () => {
		const begin = performance.now();
		await sleep(100);
		const end = performance.now();

		expect(end - begin).toBeGreaterThan(99);
	});

	it("should reject when cancelled", async () => {
		expect.assertions(1);
		const controller = new AbortController();
		controller.abort();

		try {
			await sleep(1000, controller.signal);
		} catch (e) {
			// eslint-disable-next-line jest/no-conditional-expect
			expect(e.name).toBe("AbortError");
		}
	});
});
