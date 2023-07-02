import { expect, test } from "./unittest.js";

test("blobToBase64URL", async ({ page }) => {
	const url = await page.evaluate(async () => {
		const { blobToBase64URL } = await import("/src/codec.ts");
		return blobToBase64URL(new Blob(["我好帅"], { type: "baz/qux" }));
	});
	expect(url).toBe("data:baz/qux;base64,5oiR5aW95biF");
});

test.describe("base64url", () => {
	const data = [["", ""], ["\0", "AA"], ["长测试", "6ZW_5rWL6K-V"]];

	for (let i = 0; i < data.length; i++) {
		test("should convert the buffer " + i, ({ page }) => {
			const [input, expected] = data[i];
			const result = page.evaluate(async (text) => {
				const { base64url } = await import("/src/codec.ts");
				return base64url(new TextEncoder().encode(text));
			}, input);
			return expect(result).resolves.toBe(expected);
		});
	}

	test("should support arbitrary length input", ({ page }) => {
		const result = page.evaluate(async () => {
			const { base64url } = await import("/src/codec.ts");
			return base64url(new Uint8Array(1048576 + 1));
		});
		return expect(result).resolves.toHaveLength(1398103);
	});
});
