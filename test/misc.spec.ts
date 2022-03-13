import { performance } from "perf_hooks";
import { expect, it } from "@jest/globals";
import { sleep, uniqueId } from "../lib/misc";

it("should sleep", async () => {
	const begin = performance.now();
	await sleep(100);
	const end = performance.now();

	expect(end - begin).toBeGreaterThan(99);
});

it("should generate unique id", () => {
	const a = uniqueId();
	const b = uniqueId();

	expect(a).not.toBe(b);
	expect(a).not.toBe(uniqueId());
});
