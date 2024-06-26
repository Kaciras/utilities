import { text } from "stream/consumers";
import { readFileSync } from "fs";
import { expect, test } from "./unittest.js";

test("saveFile", async ({ page }) => {
	const downloadPromise = page.waitForEvent("download");

	await page.evaluate(async () => {
		const { saveFile } = await import("/src/interactive.ts");
		saveFile(new File(["foobar"], "baz.txt"));
	});

	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe("baz.txt");

	const stream = await download.createReadStream();
	expect(await text(stream!)).toBe("foobar");
});

test("selectFile", async ({ page }) => {
	const uploadPromise = page.waitForEvent("filechooser");

	const selected = page.evaluate(async () => {
		const { selectFile } = await import("/src/interactive.ts");
		const [file] = await selectFile("image/*");

		// Return the file back for assertion.
		return { name: file.name, type: file.type, data: await file.text() };
	});

	const fileChooser = await uploadPromise;
	expect(fileChooser.isMultiple()).toBe(false);

	await fileChooser.setFiles({
		name: "foo.png",
		mimeType: "image/png",
		buffer: Buffer.from("bar"),
	});

	expect(await selected).toStrictEqual({ name: "foo.png", data: "bar", type: "image/png" });
});

test("dragHandler", async ({ page }) => {
	const messages: string[] = [];

	await page.setContent(readFileSync("test/fixtures/dragmove.html", "utf8"));
	page.on("console", msg => messages.push(msg.text()));

	await page.evaluate(async () => {
		const { dragHandler } = await import("/src/interactive.ts");
		const handler = dragHandler((e, b) => {
			console.log(`${b.pageY} - ${b.pageY} -> ${e.pageY} - ${e.pageY}`);
		});
		document.querySelector("main")!.addEventListener("pointerdown", handler);
	});

	await page.mouse.move(50, 50);
	await page.mouse.down();
	await page.mouse.move(200, 200);
	await page.mouse.up();
	await page.mouse.move(0, 0);

	expect(messages).toStrictEqual(["50 - 50 -> 200 - 200"]);
});
