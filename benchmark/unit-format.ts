import { defineSuite } from "esbench";
import { dataSizeIEC, durationFmt } from "../src/node.ts";

export default defineSuite(scene => {
	scene.bench("parse", () => durationFmt.parse("3d 1h 20m", "ns"));
	scene.bench("formatDiv", () => dataSizeIEC.formatDiv(15_234_892));
	scene.bench("formatMod", () => durationFmt.formatMod(97215, "s"));
});
