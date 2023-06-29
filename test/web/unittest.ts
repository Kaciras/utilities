import { readFileSync } from "fs";
import swc from "@swc/core";
import { expect, Request, Route, test as base } from "@playwright/test";

export { expect };

const swcrc = JSON.parse(readFileSync(".swcrc", "utf8"));

const baseURL = "http://localhost/";

// noinspection HtmlRequiredLangAttribute,HtmlRequiredTitleElement
const BlankHTML = {
	contentType: "text/html",
	body: "<html><head></head><body></body></html>",
};

function loadIndexAndModule(route: Route, request: Request) {
	const url = request.url();
	if (url === baseURL) {
		return route.fulfill(BlankHTML);
	}
	const path = decodeURIComponent(url.slice(baseURL.length));
	const { code: body } = swc.transformFileSync(path, swcrc);
	return route.fulfill({ body, contentType: "text/javascript" });
}

export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route(`${baseURL}**/*`, loadIndexAndModule);
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
