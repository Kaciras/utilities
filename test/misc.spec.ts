import { performance } from "perf_hooks";
import { expect, it } from "@jest/globals";
import { sleep } from "../lib/misc";

it("should sleep", async () => {
	const begin = performance.now();
	await sleep(100);
	const end = performance.now();

	expect(end - begin).toBeGreaterThan(99);
});
