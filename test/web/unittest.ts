import { readFileSync } from "fs";
import swc from "@swc/core";
import { expect, Request, Route, test as base } from "@playwright/test";
import v8toIstanbul from "v8-to-istanbul";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import libCoverage from "istanbul-lib-coverage";

export { expect };

const swcrc = JSON.parse(readFileSync(".swcrc", "utf8"));
swcrc.sourceMaps = true;

const baseURL = "http://localhost/";

// noinspection HtmlRequiredLangAttribute,HtmlRequiredTitleElement
const BlankHTML = {
	contentType: "text/html",
	body: "<html><head></head><body></body></html>",
};

const transformed = new Map<string, any>();

function loadIndexAndModule(route: Route, request: Request) {
	const url = request.url();
	if (url === baseURL) {
		return route.fulfill(BlankHTML);
	}
	const path = decodeURIComponent(url.slice(baseURL.length));
	const source = readFileSync(path, "utf8");
	swcrc.sourceFileName = path;
	const { code, map } = swc.transformSync(source, swcrc);
	transformed.set(url, { source, map });
	return route.fulfill({ body: code, contentType: "text/javascript" });
}

let coverages: any[];

async function reportCoverage() {
	const coverageMap = libCoverage.createCoverageMap();

	for (const coverage of coverages) {
		const { source, map } = transformed.get(coverage.url);
		const sources = {
			source: coverage.source,
			sourceMap: { sourcemap: JSON.parse(map) },
			originalSource: source,
		};
		const converter = v8toIstanbul(".", undefined, sources);
		await converter.load();
		converter.applyCoverage(coverage.functions);
		coverageMap.merge(converter.toIstanbul());
	}

	const context = libReport.createContext({
		coverageMap,
		dir: "playwright-report",
	});

	reports.create("lcov").execute(context);
}

export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route(`${baseURL}**/*`, loadIndexAndModule);
		await page.goto(baseURL);
		const browser = page.context().browser()!;

		// Coverage APIs are only supported on Chromium-based browsers.
		if (browser.browserType().name() !== "chromium") {
			return use(page);
		}

		// Schedule `reportCoverage` once on test end.
		if (!coverages) {
			coverages = [];
			browser.on("disconnected", reportCoverage);
		}

		await page.coverage.startJSCoverage();
		await use(page);
		coverages.push(...await page.coverage.stopJSCoverage());
	},
});
