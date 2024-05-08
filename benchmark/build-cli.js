import { defineSuite } from "esbench";
import { buildCLI } from "../lib/node.js";

const args = ["/sbin/agetty", "-o", "-p", "--", "\\u", "--noclear", "-", "linux"];

export default defineSuite(scene => {
	scene.bench("buildCLI", () => buildCLI(...args));
	scene.bench("JSON escape", () => args.map(v => JSON.stringify(v)).join(" "));
});
