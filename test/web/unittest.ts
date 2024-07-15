import { readFileSync } from "node:fs";
import { Profiler } from "node:inspector";
import * as importParser from "es-module-lexer";
import swc from "@swc/core";
import { expect, Request, Route, test as base } from "@playwright/test";
import v8toIstanbul from "v8-to-istanbul";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import libCoverage from "istanbul-lib-coverage";

export { expect };

const swcrc = JSON.parse(readFileSync(".swcrc", "utf8")) as swc.Options;
swcrc.swcrc = false;
swcrc.sourceMaps = true;

await importParser.init;

const baseURL = "http://localhost/";

// noinspection HtmlRequiredLangAttribute,HtmlRequiredTitleElement
const BlankHTML = {
	contentType: "text/html",
	body: "<html><head></head><body></body></html>",
};

// Satisfies unexported type `Sources` in v8-to-istanbul.
interface TransformedOutput {
	source: string;
	sourceMap: any;
	originalSource: string;
}

const transformed = new Map<string, TransformedOutput>();

function loadIndexAndModule(route: Route, request: Request) {
	const url = request.url();
	if (url === baseURL) {
		return route.fulfill(BlankHTML);
	}

	let output = transformed.get(url);
	if (output === undefined) {
		let path = url.slice(baseURL.length);
		path = decodeURIComponent(path);
		path = path.replace(/\.js$/, ".ts");

		output = compile(path);
		transformed.set(url, output);
	}

	return route.fulfill({
		body: output.source,
		contentType: "text/javascript",
	});
}

function compile(path: string): TransformedOutput {
	const originalSource = readFileSync(path, "utf8");
	let code = originalSource;

	/*
	 * Remove 3rd party imports (include Node builtin module), as
	 * they require more complex processing.
	 *
	 * It safety because this project promises no dependencies.
	 *
	 * Import statements are replaced with comments of the same length
	 * to avoid modify the source map.
	 */
	const [imports] = importParser.parse(code, path);
	for (const { n, ss, se } of imports) {
		if (n!.charCodeAt(0) !== 46 /* . */) {
			const c = `/${"*".repeat(se - ss - 2)}/`;
			code = code.slice(0, ss) + c + code.slice(se);
		}
	}

	swcrc.filename = swcrc.sourceFileName = path;
	const output = swc.transformSync(code, swcrc);

	return {
		source: output.code,
		originalSource,
		sourceMap: { sourcemap: JSON.parse(output.map!) },
	};
}

let coverages: Profiler.ScriptCoverage[];

async function reportCoverage() {
	console.info("\nCollecting test coverage...");
	const coverageMap = libCoverage.createCoverageMap();

	for (const coverage of coverages) {
		const sources = transformed.get(coverage.url)!;
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
