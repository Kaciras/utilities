import { readFileSync } from "fs";
import { Profiler } from "inspector";
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

interface TransformedItem {
	code: string;
	map: string;
	source: string;
}

const transformed = new Map<string, TransformedItem>();

function loadIndexAndModule(route: Route, request: Request) {
	const url = request.url();
	if (url === baseURL) {
		return route.fulfill(BlankHTML);
	}

	let output = transformed.get(url);
	if (output === undefined) {
		const path = decodeURIComponent(url.slice(baseURL.length));
		const source = readFileSync(path, "utf8");

		swcrc.sourceFileName = path;
		output = swc.transformSync(source, swcrc) as TransformedItem;

		output.source = source;
		transformed.set(url, output);
	}

	return route.fulfill({ body: output.code, contentType: "text/javascript" });
}

let coverages: Profiler.ScriptCoverage[];

async function reportCoverage() {
	const coverageMap = libCoverage.createCoverageMap();

	for (const coverage of coverages) {
		const { source, code, map } = transformed.get(coverage.url)!;
		const converter = v8toIstanbul(".", undefined, {
			originalSource: source,
			source: code,
			sourceMap: { sourcemap: JSON.parse(map) },
		});
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
	page: async ({ page, browser }, use) => {
		await page.route(`${baseURL}**/*`, loadIndexAndModule);
		await page.goto(baseURL);

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
