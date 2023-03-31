import { describe, expect, it } from "@jest/globals";
import { AESHelper, sha256 } from "../src/crypto.js";

describe("sha256", () => {
	const cases: Array<[any, string]> = [
		["", "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
		[Buffer.alloc(0), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
		[new Uint8Array(), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],

		["ののの", "K2GhvvD4LJyMfrQosHAOuDK1pcyvV67Uz_Ufb9xtPKU"],
		[Buffer.from("ののの"), "K2GhvvD4LJyMfrQosHAOuDK1pcyvV67Uz_Ufb9xtPKU"],
	];

	it.each(cases)("should works %#", (input, digest) => {
		return expect(sha256(input)).resolves.toBe(digest);
	});
});

describe("AESHelper", () => {
	it("should works", async () => {
		const aes = await AESHelper.withPassword("foobar");
		const encrypted = await aes.encrypt("123456");
		expect(encrypted.byteLength).toBe(22);
		await expect(aes.decryptText(encrypted)).resolves.toBe("123456");
	});
});
