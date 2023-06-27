import { describe, expect, it } from "@jest/globals";
import { base64url, escapeHTML, svgToUrl } from "../src/codec.ts";

describe("escapeHTML", () => {
	const cases = [
		['&foo <> bar "fizz" l\'a', "&amp;foo &lt;&gt; bar &quot;fizz&quot; l&#39;a"],
		["</p><a onclick=", "&lt;/p&gt;&lt;a onclick="],
		["' onclick=alert(1)", "&#39; onclick=alert(1)"],
		['" onclick=alert(1)', "&quot; onclick=alert(1)"],
		["alert&lpar;1&rpar;", "alert&amp;lpar;1&amp;rpar;"],
	];

	it.each(cases)("should escape chars %#", (input, escaped) => {
		expect(escapeHTML(input)).toBe(escaped);
	});
});

describe("svgToUrl", () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>#rect { fill: blue; }</style></defs>%3C<rect id="rect" width="10" height="10"/></svg>';

	it("should escape chars", () => {
		expect(svgToUrl(svg)).toMatchInlineSnapshot("\"%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cdefs%3E%3Cstyle%3E%23rect %7B fill: blue; %7D%3C/style%3E%3C/defs%3E%253C%3Crect id='rect' width='10' height='10'/%3E%3C/svg%3E\"");
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

	it("should support arbitrary length input", () => {
		const largeThanStackSize = Buffer.alloc(1048576 + 1);
		expect(base64url(largeThanStackSize)).toHaveLength(1398103);
	});
});
