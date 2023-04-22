import { expectAssignable } from "tsd-lite";
import { describe } from "@jest/globals";
import { Awaitable } from "../../src/lang.js";

describe("Awaitable", () => {
	expectAssignable<Awaitable<number>>(11);
	expectAssignable<Awaitable<number>>(Promise.resolve(11));
});
