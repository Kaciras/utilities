import { readFileSync } from "node:fs";
import { defineSuite, Profiler } from "esbench";
import { svgToUrl } from "../src/codec.js";

const svgBuf = readFileSync("test/fixtures/website.svg");
const svgText = svgBuf.toString();

const dataSizeProfiler: Profiler = {
	onStart: ctx => ctx.defineMetric({
		key: "size",
		format: "{dataSize}",
		analysis: 1,
		lowerIsBetter: true,
	}),
	async onCase(_, case_, metrics) {
		metrics.size = (await case_.invoke()).length;
	},
};

export default defineSuite({
	profilers: [dataSizeProfiler],
	setup(scene) {
		scene.bench("svgToUrl", () => svgToUrl(svgText));
		scene.bench("base64", () => svgBuf.toString("base64"));
	},
});
