import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { noop } from "../../src/lang.js";
import { MultiEventEmitter, pubSub2ReqRes, SingleEventEmitter } from "../../src/event.js";

describe("SingleEventEmitter", () => {
	class Sub extends SingleEventEmitter<[11]> {}

	const e = new Sub();
	e.addListener(function (arg) {
		expectType<11>(arg);
		expectType<Sub>(this);
	});

	// @ts-expect-error
	e.dispatchEvent();
	// @ts-expect-error
	e.dispatchEvent("str");
});

describe("MultiEventEmitter", () => {
	type Events = { test: [11] };

	class MSub extends MultiEventEmitter<Events> {}

	const e = new MSub();
	e.addListener("test", function (arg) {
		expectType<11>(arg);
		expectType<MSub>(this);
	});

	// @ts-expect-error
	e.dispatchEvent("NOE", 123);
	// @ts-expect-error
	e.dispatchEvent("test", "str");
});

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