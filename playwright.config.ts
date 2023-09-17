import { env } from "process";
import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
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
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				channel: env.CI && "chrome",
			},
		},
		// {
		// 	name: "firefox",
		// 	use: { ...devices["Desktop Firefox"] },
		// },
		// {
		// 	name: "webkit",
		// 	use: { ...devices["Desktop Safari"] },
		// },
	],
});
