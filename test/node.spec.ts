import { expect, it } from "@jest/globals";
import * as browser from "../src/node.js";

it("should export sub modules", () => {
	expect("isPointerInside" in browser).toBe(false);
	expect("saveFile" in browser).toBe(false);

	expect(typeof browser.onExit).toBe("function");
});
