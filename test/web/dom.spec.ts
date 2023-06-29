import { expect, test } from "./unittest.js";

test("isPointerInside", async ({ page }) => {
	await page.setContent(`
<html>
<head>
<style>
body {
width: 100vw;
height: 100vh;
}
main {
width: 100px;
height: 100px;
}
</style>
</head>
<body>
<main style=''></main>
</body>	
</html>
	`);

	await page.evaluate(async () => {
		const { isPointerInside } = await import("/src/dom.ts");
		const main = document.body.firstElementChild!;
		document.body.onclick = e => {
			main.textContent = "" + isPointerInside(e, main);
		};
	});

	await page.mouse.click(50, 50);
	expect(await page.textContent("main")).toBe("true");

	await page.mouse.click(111, 222);
	expect(await page.textContent("main")).toBe("false");
});

test("swapElements", async ({ page }) => {
	await page.setContent("<hr id='a'><hr id='b'><hr id='c'>");
	await page.evaluate(async () => {
		const { swapElements } = await import("/src/dom.ts");
		swapElements(document.getElementById("a")!, document.getElementById("c")!);
	});
	const html = await page.innerHTML("body");
	expect(html).toBe("<hr id=\"c\"><hr id=\"b\"><hr id=\"a\">");
});
