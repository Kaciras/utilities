import { expect, test } from "tstyche";
import { importCWD } from "../../src/node.js";

test("importCWD", () => {
	expect(importCWD()).type.toRaiseError();
	expect(importCWD(undefined)).type.toBe<Promise<any>>();
});
