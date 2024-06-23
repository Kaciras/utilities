import { describe, expect, it } from "@jest/globals";
import { base64url, escapeHTML, svgToUrl, transformBuffer, unescapeHTML } from "../src/codec.ts";

describe("HTML escaping", () => {
	const cases = [
		['&foo <> bar "fizz" l\'a', "&amp;foo &lt;&gt; bar &quot;fizz&quot; l&#39;a"],
		["</p><a onclick=", "&lt;/p&gt;&lt;a onclick="],
		["' onclick=alert(1)", "&#39; onclick=alert(1)"],
		['" onclick=alert(1)', "&quot; onclick=alert(1)"],
		["alert&lpar;1&rpar;", "alert&amp;lpar;1&amp;rpar;"],
	];

	it.each(cases)("should escape chars %#", (html, escaped) => {
		expect(escapeHTML(html)).toBe(escaped);
	});

	it.each(cases)("should unescape chars %#", (html, escaped) => {
		expect(unescapeHTML(escaped)).toBe(html);
	});
});

describe("svgToUrl", () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>#rect { fill: blue; }</style></defs>%3C<rect id="rect" width="10" height="10"/></svg>';

	it("should escape chars", () => {
		expect(svgToUrl(svg)).toMatchInlineSnapshot("\"%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cdefs%3E%3Cstyle%3E%23rect %7B fill: blue; %7D%3C/style%3E%3C/defs%3E%253C%3Crect id='rect' width='10' height='10'/%3E%3C/svg%3E\"");
	});
});

describe("base64url", () => {
	const textBytes = Buffer.from("长测试");

	const data: Array<[Buffer, string]> = [
		[Buffer.alloc(1), "AA"],
		[Buffer.alloc(0), ""],
		[textBytes, "6ZW_5rWL6K-V"],
	];

	it.each(data)("should convert the buffer %#", (data, str) => {
		expect(base64url(data)).toBe(str);
	});

	it.each(data)("should support ArrayBuffer %#", (data, str) => {
		const { buffer, byteOffset, length } = data;
		const end = byteOffset + length;
		expect(base64url(buffer.slice(byteOffset, end))).toBe(str);
	});

	it.each([
		new Uint8Array([233, 149, 191, 230, 181, 139, 232, 175, 149]),
		new Uint16Array([38377, 59071, 35765, 45032, 149]),
		new Uint32Array([3871315433, 2951252917, 149]),
		new DataView(textBytes.buffer, textBytes.byteOffset, textBytes.byteLength),
	])("should accept ArrayBufferView %#", (data) => {
		// Due to length rounding, there are at most 4 bytes of 0 at the end.
		expect(base64url(data)).toMatch(/^6ZW_5rWL6K-VA{0,4}$/);
	});
});

describe("transformBuffer", () => {
	const buffer = Buffer.from("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

	it("should works", async () => {
		const compress = new CompressionStream("deflate-raw");
		const decompress = new DecompressionStream("deflate-raw");

		const zipped = await transformBuffer(buffer, compress);
		expect(zipped).toHaveLength(6);

		const unzipped = await transformBuffer(zipped, decompress);
		expect(unzipped).toStrictEqual(new Uint8Array(buffer));
	});

	it("should throw error on fail", () => {
		const tx = new DecompressionStream("deflate-raw");
		return expect(transformBuffer(buffer, tx)).rejects.toThrow();
	});
});
