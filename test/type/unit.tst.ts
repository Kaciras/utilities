import { expect, test } from "tstyche";
import { dataSizeIEC, UnitConvertor } from "../../src/unit.ts";

test("default generic parameter", () => {
	expect<UnitConvertor>().type.toBeAssignableWith(dataSizeIEC);
});
