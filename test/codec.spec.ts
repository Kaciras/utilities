import { describe, it, expect } from "@jest/globals";
import { base64url, escapeHTML } from "../lib/codec";

describe("escapeHTML", () => {
	const cases = [
		["</p><a onclick=", "&lt;/p&gt;&lt;a onclick="],
		["' onclick=alert(1)", "&#039; onclick=alert(1)"],
		['" onclick=alert(1)', "&quot; onclick=alert(1)"],
		["alert&lpar;1&rpar;", "alert&amp;lpar;1&amp;rpar;"],
	];

	it.each(cases)("should escape chars %#", (input, escaped) => {
		expect(escapeHTML(input)).toBe(escaped);
	});
});

describe("base64url", () => {
	const data: Array<[Buffer, string]> = [
		[Buffer.alloc(1), "AA"],
		[Buffer.alloc(0), ""],
		[Buffer.from("长测试"), "6ZW_5rWL6K-V"],
	];

	it.each(data)("should convert the buffer %#", (data, str) => {
		expect(base64url(data)).toBe(str);
	});

	it.each(data)("should support ArrayBuffer %#", (data, str) => {
		const { buffer, byteOffset, length } = data;
		const end = byteOffset + length;
		expect(base64url(buffer.slice(byteOffset, end))).toBe(str);
	});
});
