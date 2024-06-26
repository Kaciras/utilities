import { randomBytes } from "crypto";
import { defineSuite } from "esbench";
import { base64url } from "../src/codec.js";

const data = randomBytes(1024 * 1024);

export default defineSuite({
	params: {
		environment: ["node", "browser"],
	},
	setup(scene) {
		if (scene.params.environment === "browser") {
			globalThis.window = true as any;
		}
		scene.bench("base64url", () => base64url(data));
	},
});
