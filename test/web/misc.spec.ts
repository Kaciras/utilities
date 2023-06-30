import { expect, test } from "./unittest.js";

test.describe("sleep", () => {
	test("should fulfill after the time", ({ page }) => {
		const task = page.evaluate(async () => {
			const { sleep } = await import("/src/misc.ts");

			const begin = performance.now();
			await sleep(50);
			return performance.now() - begin;
		});
		return expect(task).resolves.toBeGreaterThan(49);
	});

	test("should reject when cancelled", ({ page }) => {
		const task = page.evaluate(async () => {
			const { sleep } = await import("/src/misc.ts");

			const controller = new AbortController();
			controller.abort();
			return sleep(1000, controller.signal).catch(e => e.name);
		});
		return expect(task).resolves.toBe("AbortError");
	});
});
