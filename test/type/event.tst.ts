// noinspection JSVoidFunctionReturnValueUsed

import { expect, test } from "tstyche";
import { noop } from "../../src/lang.ts";
import { MultiEventEmitter, pubSub2ReqRes, SingleEventEmitter } from "../../src/event.ts";

test("SingleEventEmitter", () => {
	class Sub extends SingleEventEmitter<[11]> {}

	const e = new Sub();

	e.addListener(function (arg) {
		expect(arg).type.toBe<11>();
		expect(this).type.toBe<Sub>();
	});

	e.dispatchEvent(11);

	// @ts-expect-error
	e.dispatchEvent();
	// @ts-expect-error
	e.dispatchEvent("str");
});

test("MultiEventEmitter", () => {
	class MSub extends MultiEventEmitter<{ test: [11] }> {}

	const e = new MSub();

	e.addListener("test", function (arg) {
		expect(arg).type.toBe<11>();
		expect(this).type.toBe<MSub>();
	});

	e.dispatchEvent("test", 11);
	// @ts-expect-error
	e.dispatchEvent("NOE", 123);
	// @ts-expect-error
	e.dispatchEvent("test");
	// @ts-expect-error
	e.dispatchEvent("test", "str");

	e.removeAllListeners("test");
	e.removeAllListeners();
	// @ts-expect-error
	e.removeAllListeners("NOE");
});

test("message should be object", () => {
	pubSub2ReqRes<object, object>(noop);

	// @ts-expect-error
	pubSub2ReqRes<number, object>(noop);
	// @ts-expect-error
	pubSub2ReqRes<object, string>(noop);
});

test("message should compat session id", () => {
	pubSub2ReqRes<{ foo: 11 }, object>(noop);
	pubSub2ReqRes<{ s: undefined }, object>(noop);

	// @ts-expect-error
	pubSub2ReqRes<object, { r: string }>(noop);

	// @ts-expect-error
	pubSub2ReqRes<{ s?: true | number }, object>(noop);
});

test("pubSub2ReqRes - request", () => {
	type ResponseMessage = { foo: 11; bar: string };
	const { request } = pubSub2ReqRes<any, ResponseMessage>(noop);
	expect(request({})).type.toBe<Promise<ResponseMessage>>();
});
