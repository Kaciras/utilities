import { afterEach, beforeEach, expect, it } from "@jest/globals";
import { getLocal } from "mockttp";
import { FetchClient, FetchClientError } from "../lib/fetch.js";

const httpServer = getLocal();
beforeEach(() => httpServer.start());
afterEach(() => httpServer.stop());

it("should works", async () => {
	const client = new FetchClient(httpServer.url);

	await httpServer.forGet("/").thenReply(200, "OKOK!");

	const response = await client.get("/");
	await expect(response.text()).resolves.toBe("OKOK!");
});

it("should merge headers", async () => {
	const client = new FetchClient(httpServer.url, {
		// @ts-ignore
		headers: {
			foo: "bar",
			"content-type": "text/html",
			baz: undefined,
		},
	});
	const json = { foo: 11, bar: 22 };

	await httpServer.forPost("/")
		.withHeaders({
			foo: "bar",
			"content-type": "application/json",
		})
		.withJsonBody(json)
		.thenReply(200, "OKOK!");

	const response = await client.post("/", json);
	await expect(response.text()).resolves.toBe("OKOK!");
});

it("should serialize parameters", async () => {
	const client = new FetchClient(httpServer.url);
	await httpServer.forHead("/")
		.withExactQuery("?start=0&count=11")
		.thenReply(201);
	
	const response = await client.head("/", {
		start: 0,
		count: 11,
	});
	expect(response.status).toBe(201);
});

it("should check the status", async () => {
	const client = new FetchClient(httpServer.url);

	await httpServer.forDelete("/posts/1").thenReply(451);

	const response = client.delete("/posts/1");
	await expect(response)
		.rejects
		.toThrow(FetchClientError);

	expect((await response.raw).status).toBe(451);
});

it("should return the JSON body",async () => {
	const client = new FetchClient(httpServer.url);
	const json = { foo: 11, bar: 22 };

	await httpServer.forPatch("/")
		.thenReply(200, JSON.stringify(json));

	const actual = await client.patch("/").json();
	expect(actual).toEqual(json);
});

it("should support submit FormData", async () => {
	const client = new FetchClient(httpServer.url);

	const ep = await httpServer.forPut("/").thenReply(200);

	const form = new FormData();
	form.set("foo", new Blob(["BLOB_PART"]));

	await client.put("/", form);

	const [request] = await ep.getSeenRequests();
	const ff = await request.body.getText();
	expect(ff).toMatch("Content-Type: application/octet-stream\r\n\r\nBLOB_PART");
});
