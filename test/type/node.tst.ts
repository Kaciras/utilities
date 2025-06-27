import { expect, test } from "tstyche";
import { importCWD } from "../../src/node.js";

test("importCWD", () => {
	// @ts-expect-error
	importCWD();
	expect(importCWD(undefined)).type.toBe<Promise<any>>();
});
