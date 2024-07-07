import { readFileSync } from "fs";
import { expect, test } from "./unittest.js";

const rects = readFileSync("test/fixtures/3-rects.html", "utf8")
	.replaceAll("\n", ""); // Avoid text nodes of "\n"

test("isPointerInside", async ({ page }) => {
	await page.setContent(rects);

	await page.evaluate(async () => {
		const { isPointerInside } = await import("/src/dom.ts");
		const main = document.body.firstElementChild!;
		document.body.onclick = e => {
			document.title = "" + isPointerInside(e, main);
		};
	});

	await page.mouse.click(50, 50);
	expect(await page.title()).toBe("true");

	await page.mouse.click(111, 222);
	expect(await page.title()).toBe("false");
});

test.describe("swapElements", () => {
	test.beforeEach(({ page }) => page.setContent(rects));

	test("with end", async ({ page }) => {
		await page.evaluate(async () => {
			const { swapElements } = await import("/src/dom.ts");
			swapElements(document.getElementById("A")!, document.getElementById("C")!);
		});
		expect(await page.innerText("body")).toBe("C\nB\nA");
	});

	test("with next", async ({ page }) => {
		await page.evaluate(async () => {
			const { swapElements } = await import("/src/dom.ts");
			swapElements(document.getElementById("A")!, document.getElementById("B")!);
		});
		expect(await page.innerText("body")).toBe("B\nA\nC");
	});

	test("with previous", async ({ page }) => {
		await page.evaluate(async () => {
			const { swapElements } = await import("/src/dom.ts");
			swapElements(document.getElementById("B")!, document.getElementById("A")!);
		});
		expect(await page.innerText("body")).toBe("B\nA\nC");
	});
});

test.describe("nthInChildren", () => {
	test.beforeEach(({ page }) => page.setContent(rects));

	test("should work", async ({ page }) => {
		const task = page.evaluate(async () => {
			const { nthInChildren } = await import("/src/dom.ts");
			return nthInChildren(document.getElementById("C")!);
		});
		return expect(task).resolves.toBe(2);
	});

	test("begin index", async ({ page }) => {
		const task = page.evaluate(async () => {
			const { nthInChildren } = await import("/src/dom.ts");
			return nthInChildren(document.getElementById("C")!, 2);
		});
		return expect(task).resolves.toBe(2);
	});

	test("fail on no parent", async ({ page }) => {
		const task = page.evaluate(async () => {
			return (await import("/src/dom.ts")).nthInChildren(document);
		});
		return expect(task).rejects.toThrow(/Cannot read properties/);
	});
});

test.describe("dragSortContext", () => {
	test.beforeEach(({ page }) => page.setContent(rects));

	async function setup(swap?: boolean) {
		const { dragSortContext } = await import("/src/dom.ts");
		const ctx = (window as any)._ctx = dragSortContext(swap);
		for (const div of document.getElementsByTagName("div")) {
			ctx.register(div);
			div.draggable = true;
		}
	}

	function unregister(id: string) {
		(window as any)._ctx.unregister(document.getElementById(id));
	}

	test("insert before", async ({ page }) => {
		await page.evaluate(setup, undefined);
		await page.dragAndDrop("#C", "#A");
		expect(await page.innerText("body")).toBe("C\nA\nB");
	});

	test("insert after", async ({ page }) => {
		await page.evaluate(setup, undefined);
		await page.dragAndDrop("#A", "#C");
		expect(await page.innerText("body")).toBe("B\nC\nA");
	});

	test("swap", async ({ page }) => {
		await page.evaluate(setup, true);
		await page.dragAndDrop("#A", "#C");
		expect(await page.innerText("body")).toBe("C\nB\nA");
	});

	test("unregister", async ({ page }) => {
		await page.evaluate(setup, undefined);
		await page.evaluate(unregister, "C");

		await page.dragAndDrop("#A", "#C");
		expect(await page.innerText("body")).toBe("A\nB\nC");
	});

	test("unregister 2", async ({ page }) => {
		await page.evaluate(setup, undefined);
		await page.evaluate(unregister, "C");

		await page.dragAndDrop("#C", "#A");
		expect(await page.innerText("body")).toBe("A\nB\nC");
	});
});
