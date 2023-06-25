import { describe } from "@jest/globals";
import { expectType } from "tsd-lite";
import { noop } from "../../src/lang.ts";
import { MultiEventEmitter, pubSub2ReqRes, SingleEventEmitter } from "../../src/event.ts";

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
	e.dispatchEvent(11);
});

describe("MultiEventEmitter", () => {
	class MSub extends MultiEventEmitter<{ test: [11] }> {}

	const e = new MSub();

	e.addListener("test", function (arg) {
		expectType<11>(arg);
		expectType<MSub>(this);
	});

	// @ts-expect-error
	e.dispatchEvent("NOE", 123);
	// @ts-expect-error
	e.dispatchEvent("test");
	// @ts-expect-error
	e.dispatchEvent("test", "str");
	e.dispatchEvent("test", 11);

	// @ts-expect-error
	e.removeAllListeners("NOE");
	e.removeAllListeners();
	e.removeAllListeners("test");
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
