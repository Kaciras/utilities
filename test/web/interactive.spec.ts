import { text } from "stream/consumers";
import { expect, test } from "./unittest.js";

test("saveFile", async ({ page }) => {
	const downloadPromise = page.waitForEvent("download");

	await page.evaluate(async () => {
		const { saveFile } = await import("/src/interactive.ts");
		saveFile(new File(["foobar"], "baz.txt"));
	});

	const download = await downloadPromise;
	console.log(await download.suggestedFilename());

	const fp = await download.createReadStream();
	expect(await text(fp!)).toBe("foobar");
});
