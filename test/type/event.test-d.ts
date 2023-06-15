import { describe } from "@jest/globals";
import { expectError } from "tsd-lite";
import { noop } from "../../src/lang.js";
import { pubSub2ReqRes } from "../../src/event.js";

describe("message should be object", () => {
	pubSub2ReqRes<object, object>(noop);

	// @ts-expect-error
	expectError(pubSub2ReqRes<number, object>(noop));
	// @ts-expect-error
	expectError(pubSub2ReqRes<object, string>(noop));
});

describe("message should compat session id", () => {
	pubSub2ReqRes<{ foo: 11 }, object>(noop);
	pubSub2ReqRes<{ s: undefined }, object>(noop);

	// @ts-expect-error
	expectError(pubSub2ReqRes<object, { r: string }>(noop));

	// @ts-expect-error
	expectError(pubSub2ReqRes<{ s?: true | number }, object>(noop));
});
