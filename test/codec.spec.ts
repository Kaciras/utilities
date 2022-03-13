import { describe, it, expect } from "@jest/globals";
import { base64url, escapeHTML, svgToUrl } from "../lib/codec";

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

describe("svgToUrl", () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M224 387.814V512L32 320l192-192v126.912C447.375 260.152 437.794 103.016 380.93 0 521.287 151.707 491.48 394.785 224 387.814z"/></svg>';
	const encoded = "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath d='M224 387.814V512L32 320l192-192v126.912C447.375 260.152 437.794 103.016 380.93 0 521.287 151.707 491.48 394.785 224 387.814z'/%3E%3C/svg%3E";

	it("should escape chars", () => {
		expect(svgToUrl(svg)).toBe(encoded);
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
