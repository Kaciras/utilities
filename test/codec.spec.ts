import { describe, it, expect } from "@jest/globals";
import { base64url } from "../lib/codec";

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

