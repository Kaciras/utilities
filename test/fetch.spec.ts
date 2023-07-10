import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { getLocal } from "mockttp";
import { identity } from "../src/lang.ts";
import { FetchClient, FetchClientError, fetchFile, ResponseFacade } from "../src/fetch.ts";

describe("fetchFile", () => {
	const fetchStub = jest.spyOn(globalThis, "fetch");

	afterAll(() => void fetchStub.mockReset());

	it("should throw error if status is not 2xx", () => {
		fetchStub.mockResolvedValue(new Response("", { status: 429 }));
		return expect(fetchFile("/foo.json"))
			.rejects
			.toThrow(new Error("Failed to fetch /foo.json (429)"));
	});

	it("should get url from Request object", () => {
		fetchStub.mockResolvedValue(new Response("", { status: 429 }));
		return expect(fetchFile(new Request("https://foo.bar")))
			.rejects
			.toThrow(new Error("Failed to fetch https://foo.bar/ (429)"));
	});

	it("should pass arguments to fetch function", async () => {
		fetchStub.mockResolvedValue(new Response("bar"));

		await fetchFile(new Request("http://example.com"), {
			method: "POST",
		});

		const [request, init] = fetchStub.mock.calls[0];
		expect(init!.method).toBe("POST");
		expect((request as Request).url).toBe("http://example.com/");
	});

	it("should works", async () => {
		fetchStub.mockResolvedValue(new Response("bar", {
			headers: {
				"content-type": "application/json",
				"last-modified": "Sat, 03 Dec 2022 01:55:19 GMT",
			},
		}));
		const file = await fetchFile("/bar/foo.json");

		expect(file.type).toBe("application/json");
		expect(file.size).toBe(3);
		expect(file.name).toBe("foo.json");
		expect(file.lastModified).toBe(1670032519000);
		await expect(file.text()).resolves.toBe("bar");
	});

	it("should have default values properties", async () => {
		fetchStub.mockResolvedValue(new Response("bar"));
		const now = new Date().getTime();

		const file = await fetchFile("https://example.com");

		expect(file.name).toBe("downloaded");
		expect(file.type).toBe("text/plain;charset=utf-8");
		expect(file.lastModified).toBeGreaterThanOrEqual(now);
	});
});

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
		const client = new FetchClient();
		await httpServer.forGet("/").thenReply(200, "OKOK!");

		const response = await client.get(httpServer.url);
		expect(response.status).toBe(200);
		await expect(response.text()).resolves.toBe("OKOK!");
	});

	it("should prepend url with baseURL", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forGet("/posts/1").thenReply(200);

		expect((await client.get("/posts/1")).status).toBe(200);
	});

	it("should merge headers", async () => {
		const client = new FetchClient({
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

		const response = await client.post(httpServer.url, json);
		await expect(response.text()).resolves.toBe("OKOK!");
	});

	it("should not modify the base request", async () => {
		const init = { method: "POST", headers: { foo: "bar" } };
		const client = new FetchClient({ init });
		await httpServer.forGet("/").thenReply(200, "OKOK!");

		const response = await client.get(httpServer.url);
		await expect(response.text()).resolves.toBe("OKOK!");
		expect(init.method).toBe("POST");
		expect(init.headers).toStrictEqual({ foo: "bar" });
	});

	it("should get the location", async () => {
		const client = new FetchClient();
		await httpServer.forGet()
			.thenReply(200, "OKOK!", { location: "/abc" });
		await expect(client.get(httpServer.url).location).resolves.toBe("/abc");
	});

	it("should serialize parameters", async () => {
		const client = new FetchClient();
		await httpServer.forHead("/")
			.withExactQuery("?start=0&count=11")
			.thenReply(201);

		const response = await client.head(httpServer.url, {
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
		const error = await response.catch(identity);

		expect(error).toBeInstanceOf(FetchClientError);
		expect(error.name).toBe("FetchClientError");
		expect(error.code).toBe(451);
		expect(error.message).toBe("Fetch failed. (451)");
	});

	it("should work with custom fetch function", async () => {
		const stubResponse = new Response();
		const mockFetch = jest.fn<typeof fetch>().mockResolvedValue(stubResponse);
		const client = new FetchClient({ baseURL: "ftp://a.com", fetch: mockFetch });

		await expect(client.delete("/s.txt")).resolves.toBe(stubResponse);

		const request = mockFetch.mock.calls[0][0] as Request;
		expect(request.credentials).toBe("include");
		expect(request.url).toBe("ftp://a.com/s.txt");
	});

	it("should support skip the status checking", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forDelete("/posts/1").thenReply(451);

		const response = client.delete("/posts/1");
		expect((await response.unchecked).status).toBe(451);
	});

	it("should quick check the status", async () => {
		const client = new FetchClient({ baseURL: httpServer.url });
		await httpServer.forGet("/").thenReply(206);

		const response = client.get("/");
		await expect(response.hasStatus(206)).resolves.toBe(true);
	});

	it("should return the JSON body", async () => {
		const client = new FetchClient();
		const json = { foo: 11, bar: 22 };

		await httpServer.forPatch("/")
			.thenReply(200, JSON.stringify(json));

		const actual = await client.patch(httpServer.url).json();
		expect(actual).toEqual(json);
	});

	it("should support custom checker", async () => {
		const check = jest.fn(identity);
		await httpServer.forGet("/").thenReply(503);

		const client = new FetchClient({ check });
		const response = await client.get(httpServer.url);

		expect(response.status).toBe(503);
		expect(check).toHaveBeenCalledTimes(1);
	});

	it("should post primitives as string", async () => {
		const client = new FetchClient();
		const ep = await httpServer.forPut("/").thenReply(200);

		await client.put(httpServer.url, 123);

		const [request] = await ep.getSeenRequests();
		await expect(request.body.getText()).resolves.toBe("123");
		expect(request.headers["content-type"]).toBe("text/plain;charset=UTF-8");
	});

	it("should post Blobs", async () => {
		const client = new FetchClient();
		const ep = await httpServer.forPut("/").thenReply(200);

		const blob = new Blob(["foobar"], { type: "foo/bar" });
		await client.put(httpServer.url, blob);

		const [request] = await ep.getSeenRequests();
		expect(request.headers["content-type"]).toBe("foo/bar");
		await expect(request.body.getText()).resolves.toBe("foobar");
	});

	it("should submit FormData", async () => {
		const client = new FetchClient();
		const ep = await httpServer.forPut("/").thenReply(200);

		const form = new FormData();
		form.set("foo", new Blob(["BLOB_PART"]));

		await client.put(httpServer.url, form);

		const [request] = await ep.getSeenRequests();
		expect(request.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
		await expect(request.body.getText())
			.resolves
			.toMatch("Content-Type: application/octet-stream\r\n\r\nBLOB_PART");
	});
});
