import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { getLocal } from "mockttp";
import { identity } from "../src/lang.js";
import { FetchClient, FetchClientError, ResponseFacade } from "../src/fetch.js";

describe("ResponseFacade", () => {
	it("should implement Promise.then", async () => {
		const error = new Error();
		let caught = null;
		let thenCalled = false;

		await new ResponseFacade(Promise.reject(error), identity)
			.then(() => thenCalled = true)
			.catch(error => caught = error);

		expect(caught).toBe(error);
		expect(thenCalled).toBe(false);
	});

	it("should implement Promise.finally", async () => {
		const error = new Error();
		let finallyCalled = false;

		const f = new ResponseFacade(Promise.reject(error), identity)
			.finally(() => finallyCalled = true);

		await expect(f).rejects.toThrow(error);
		expect(finallyCalled).toBe(true);
	});

	it("should have string representation", () => {
		const fetching = Promise.resolve(new Response());
		const facade = new ResponseFacade(fetching, identity);
		expect("" + facade).toBe("[object ResponseFacade]");
	});
});

describe("FetchClient", () => {
	// We don't restart the server each test, always setup rules before fetching.
	const httpServer = getLocal();
	beforeAll(() => httpServer.start());
	afterAll(() => httpServer.stop());

	it("should works", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forGet("/").thenReply(200, "OKOK!");

		const response = await client.get("/");
		await expect(response.text()).resolves.toBe("OKOK!");
	});

	it("should merge headers", async () => {
		const client = new FetchClient({
			baseURL: httpServer.url,
			init: {
				headers: {
					foo: "bar",
					"content-type": "text/html",
				},
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

	it("should not modify the base request", async () => {
		const baseRequest = {
			method: "POST",
			headers: { foo: "bar" },
		};
		const client = new FetchClient({
			baseURL: httpServer.url,
			init: baseRequest,
		});
		await httpServer.forGet("/").thenReply(200, "OKOK!");

		const response = await client.get("/");
		await expect(response.text()).resolves.toBe("OKOK!");
		expect(baseRequest.method).toBe("POST");
		expect(baseRequest.headers).toStrictEqual({ foo: "bar" });
	});

	it("should get the location", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forGet("/").thenReply(200, "OKOK!", { location: "/abc" });
		await expect(client.get("/").location).resolves.toBe("/abc");
	});

	it("should serialize parameters", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forHead("/")
			.withExactQuery("?start=0&count=11")
			.thenReply(201);

		const response = await client.head("/", {
			start: 0,
			count: 11,
			baz: undefined,
		});
		expect(response.status).toBe(201);
	});

	it("should check the status", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forDelete("/posts/1").thenReply(451);

		const response = client.delete("/posts/1");

		expect((await response.raw).status).toBe(451);

		const error = await response.catch(identity);
		expect(error).toBeInstanceOf(FetchClientError);
		expect(error.name).toBe("FetchClientError");
		expect(error.code).toBe(451);
		expect(error.message).toBe("Fetch failed. (451)");
	});

	it("should work with custom fetch function", async () => {
		const mockFetch = jest.fn<typeof fetch>();
		const client = new FetchClient({ baseURL: "ftp://a.com", fetch: mockFetch });

		const stubResponse = new Response();
		mockFetch.mockResolvedValue(stubResponse);

		await expect(client.delete("/s.txt")).resolves.toBe(stubResponse);
		expect((mockFetch.mock.calls[0][0] as Request).url).toBe("ftp://a.com/s.txt");
	});

	it("should return the JSON body", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		const json = { foo: 11, bar: 22 };

		await httpServer.forPatch("/")
			.thenReply(200, JSON.stringify(json));

		const actual = await client.patch("/").json();
		expect(actual).toEqual(json);
	});

	it("should support custom checker", async () => {
		const check = jest.fn(identity);
		await httpServer.forGet("/").thenReply(503);

		const client = new FetchClient({ baseURL: httpServer.url, check });
		const response = await client.get("/");

		expect(response.status).toBe(503);
		expect(check).toHaveBeenCalledTimes(1);
	});

	it("should post Blobs", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		const ep = await httpServer.forPut("/").thenReply(200);

		const blob = new Blob(["foobar"], { type: "foo/bar" });
		await client.put("/", blob);

		const [request] = await ep.getSeenRequests();
		expect(request.headers["content-type"]).toBe("foo/bar");
		await expect(request.body.getText()).resolves.toBe("foobar");
	});

	it("should submit FormData", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		const ep = await httpServer.forPut("/").thenReply(200);

		const form = new FormData();
		form.set("foo", new Blob(["BLOB_PART"]));

		await client.put("/", form);

		const [request] = await ep.getSeenRequests();
		expect(request.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
		await expect(request.body.getText())
			.resolves
			.toMatch("Content-Type: application/octet-stream\r\n\r\nBLOB_PART");
	});
});
