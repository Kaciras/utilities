import assert from "node:assert";
import { importCWD } from "../lib/node.js";

assert.strictEqual(await importCWD(undefined, ["NON-EXISTS.js"]), undefined);

const jestConfig = await importCWD(undefined, ["NON-EXISTS.js", "jest.config.js"]);
assert.ok(Array.isArray(jestConfig.testMatch));

await assert.rejects(importCWD(undefined, ["test/fixtures/nested-not-found.js"]), Error);
