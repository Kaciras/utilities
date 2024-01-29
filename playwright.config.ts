import { env } from "process";
import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Use builtin chrome on CI:
 * https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md
 */
export default defineConfig({
	testDir: "./test/web",
	forbidOnly: !!env.CI,

	// Disable parallel execution for collect coverage.
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://localhost/",
		trace: "on-first-retry",
	},
	projects: [{
		name: "chromium",
		use: {
			...devices["Desktop Chrome"],
			channel: env.CI && "chrome",
		},
	}],
});
