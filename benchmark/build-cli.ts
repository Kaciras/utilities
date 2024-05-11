import { defineSuite } from "esbench";
import { buildCLI } from "../src/node.ts";

const args = ["/sbin/agetty", "-o", "-p", "--", "\\u", "--noclear", "-", "linux"];

export default defineSuite(scene => {
	scene.bench("buildCLI", () => buildCLI(...args));
	scene.bench("JSON escape", () => args.map(v => JSON.stringify(v)).join(" "));
});
