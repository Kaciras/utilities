import { expect, it } from "@jest/globals";
import * as browser from "../src/browser.ts";

it("should export sub modules", () => {
	expect("onExit" in browser).toBe(false);
	expect(typeof browser.isPointerInside).toBe("function");
	expect(typeof browser.saveFile).toBe("function");
});
