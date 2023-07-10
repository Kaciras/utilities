import { expect, test } from "./unittest.js";

declare const window: Window & {
	$S: Promise<void>;
	$C: AbortController;
};

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

	test("should reject when cancelled", async ({ page }) => {
		await page.evaluate(async () => {
			const { sleep } = await import("/src/misc.ts");

			const { signal } = window.$C = new AbortController();
			window.$S = sleep(1000, signal);
		});
		const task = page.evaluate(() => {
			window.$C.abort(new Error("Test"));
			return window.$S.catch(e => [
				e.message,
				Object.getPrototypeOf(e).constructor.name,
			]);
		});
		return expect(task).resolves.toStrictEqual(["Test", "Error"]);
	});

	test("should reject when already cancelled", ({ page }) => {
		const task = page.evaluate(async () => {
			const { sleep } = await import("/src/misc.ts");

			const controller = new AbortController();
			controller.abort();
			return sleep(1000, controller.signal).catch(e => [
				e.name,
				Object.getPrototypeOf(e).constructor.name,
			]);
		});
		return expect(task).resolves.toStrictEqual(["AbortError", "DOMException"]);
	});
});
