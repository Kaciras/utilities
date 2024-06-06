import { defineConfig, PlaywrightExecutor } from "esbench/host";
import { chromium, firefox, webkit } from "@playwright/test";

export default defineConfig({
	toolchains: [{
		include: ["./benchmark/*.ts"],
	}, {
		include: ["./benchmark/web/*.ts"],
		executors: [
			new PlaywrightExecutor(firefox),
			new PlaywrightExecutor(webkit),
			new PlaywrightExecutor(chromium),
		],
	}],
});
