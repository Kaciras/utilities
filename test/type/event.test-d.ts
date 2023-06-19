import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { noop } from "../../src/lang.js";
import { pubSub2ReqRes } from "../../src/event.js";

describe("message should be object", () => {
	pubSub2ReqRes<object, object>(noop);

	// @ts-expect-error
	pubSub2ReqRes<number, object>(noop);
	// @ts-expect-error
	pubSub2ReqRes<object, string>(noop);
});

describe("message should compat session id", () => {
	pubSub2ReqRes<{ foo: 11 }, object>(noop);
	pubSub2ReqRes<{ s: undefined }, object>(noop);

	// @ts-expect-error
	pubSub2ReqRes<object, { r: string }>(noop);

	// @ts-expect-error
	pubSub2ReqRes<{ s?: true | number }, object>(noop);
});

describe("pubSub2ReqRes - request", () => {
	type ResponseMessage = { foo: 11; bar: string };
	const { request } = pubSub2ReqRes<any, ResponseMessage>(noop);
	expectType<Promise<ResponseMessage>>(request({}));
});
