import { expect, test } from "./unittest.js";

test("blobToBase64URL", async ({ page }) => {
	const url = await page.evaluate(async () => {
		const { blobToBase64URL } = await import("/src/codec.ts");
		return blobToBase64URL(new Blob(["我好帅"], { type: "baz/qux" }));
	});
	expect(url).toBe("data:baz/qux;base64,5oiR5aW95biF");
});
