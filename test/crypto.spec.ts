import { it, expect } from "@jest/globals";
import { sha256 } from "../lib/crypto";

const cases = [
	["", "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
	[Buffer.alloc(0), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
	[new Uint8Array(), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],

	["ののの", "K2GhvvD4LJyMfrQosHAOuDK1pcyvV67Uz_Ufb9xtPKU"],
	[Buffer.from("ののの"), "K2GhvvD4LJyMfrQosHAOuDK1pcyvV67Uz_Ufb9xtPKU"],
];

it.each(cases)("should get sha256 digest %#", (input, digest) => {
	return expect(sha256(input)).resolves.toBe(digest);
});
