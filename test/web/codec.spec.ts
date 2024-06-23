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

	test("should support input larger than the stack", ({ page }) => {
		const result = page.evaluate(async () => {
			const { base64url } = await import("/src/codec.ts");
			return base64url(new Uint8Array(1048576 + 1));
		});
		return expect(result).resolves.toHaveLength(1398103);
	});

	test("should accept Uint8Array", async () => {
		const { base64url } = await import("/src/codec.ts");
		const data = new Uint8Array([233, 149, 191, 230, 181, 139, 232, 175, 149]);
		expect(base64url(data)).toBe("6ZW_5rWL6K-V");
	});

	test("should accept Uint16Array", async () => {
		const { base64url } = await import("/src/codec.ts");
		const data = new Uint16Array([38377, 59071, 35765, 45032, 149]);
		expect(base64url(data)).toBe("6ZW_5rWL6K-VAA");
	});

	test("should accept Uint32Array", async () => {
		const { base64url } = await import("/src/codec.ts");
		const data = new Uint32Array([3871315433, 2951252917, 149]);
		expect(base64url(data)).toBe("6ZW_5rWL6K-VAAAA");
	});

	test("should accept DataView", async () => {
		const { base64url } = await import("/src/codec.ts");
		const data = new Uint8Array([233, 149, 191, 230, 181, 139, 232, 175, 149]);
		expect(base64url(new DataView(data.buffer))).toBe("6ZW_5rWL6K-V");
	});
});
