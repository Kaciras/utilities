import { readFileSync } from "fs";
import swc from "@swc/core";
import { expect, test as base } from "@playwright/test";

export { expect };

const swcrc = JSON.parse(readFileSync(".swcrc", "utf8"));

const baseURL = "http://localhost/";

// noinspection HtmlRequiredLangAttribute,HtmlRequiredTitleElement
const BlankHTML = {
	contentType: "text/html",
	body: "<html><head></head><body></body></html>",
};

export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route("**/*", (route, request) => {
			if (request.url() === baseURL) {
				return route.fulfill(BlankHTML);
			}
			const path = decodeURIComponent(request.url().slice(baseURL.length));
			const { code: body } = swc.transformFileSync(path, swcrc);
			return route.fulfill({ body, contentType: "text/javascript" });
		});

		await page.goto(baseURL);

		// Coverage APIs are only supported on Chromium-based browsers.
		if (page.context().browser()!.browserType().name() !== "chromium") {
			return use(page);
		}

		await page.coverage.startJSCoverage();
		await use(page);
		const coverage = await page.coverage.stopJSCoverage();
	},
});
