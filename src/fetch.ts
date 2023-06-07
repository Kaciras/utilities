import { OnFulfilled, OnRejected } from "./lang.js";

/**
 * Fetch the resource into a File object, detect name and last modified from response.
 *
 * @param input This defines the resource that you wish to fetch.
 * @param init An object containing any custom settings that you want to apply to the request.
 */
export async function fetchFile(input: RequestInfo, init?: RequestInit) {
	const url = typeof input === "string" ? input : input.url;

	const response = await fetch(input, init);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url} (${response.status})`);
	}

	const blob = await response.blob();
	const timeHeader = response.headers.get("last-modified");
	const lastModified = timeHeader ? new Date(timeHeader).getTime() : undefined;

	// A dummy origin is needed to build URL object with a partial url.
	const name = new URL(url, "a://b")
		.pathname
		.split("/").at(-1) || "downloaded";

	return new File([blob], name, { type: blob.type, lastModified });
}

/**
 * The HTTP request was successful but failed the application layer checks.
 */
export class FetchClientError extends Error {

	/*
	 * Don't do `FetchClientError.prototype.name=<name>`
	 * because it can not be tree-shaking.
	 */
	name = "FetchClientError";

	readonly response: Response;
	readonly code: number;

	constructor(response: Response, msg?: string) {
		super(msg ?? `Fetch failed. (${response.status})`);
		this.response = response;
		this.code = response.status;
	}
}

type Params = Record<string, any>;

const defaultRequest: RequestInit = {
	credentials: "include",
};

type Check = (task: Promise<Response>) => Promise<Response>;

async function checkStatus(fetching: Promise<Response>) {
	const response = await fetching;
	if (response.ok) {
		return response;
	}
	throw new FetchClientError(response);
}

/**
 * Wrapper for Promise<Response>, provide status checking and useful method alias.
 *
 * @example
 * // await it will check the response status.
 * try {
 *     const response = await client.get(...);
 *     assert(response.ok);
 * } catch (e) {
 *     console.error(e.message);
 * }
 *
 * // Use `raw` to get the original response promise.
 * const unchecked = await client.get(...).raw;
 *
 * // Get the response body in JSON format.
 * const data = await client.get(...).json<Type>();
 *
 * // Get the Location header.
 * const location = await apiService.get(...).location;
 */
export class ResponseFacade implements Promise<Response> {

	readonly raw: Promise<Response>;

	private readonly check: Check;

	constructor(raw: Promise<Response>, check: Check) {
		this.raw = raw;
		this.check = check;
	}

	json<T = any>(): Promise<T> {
		return this.then(r => r.json());
	}

	get location(): Promise<string> {
		return this.then(r => r.headers.get("location")!);
	}

	get [Symbol.toStringTag]() {
		return "ResponseFacade";
	}

	catch<E = never>(onRejected: OnRejected<E>) {
		return this.check(this.raw).catch(onRejected);
	}

	finally(onFinally?: any): Promise<Response> {
		return this.check(this.raw).finally(onFinally);
	}

	then<T = Response, R = never>(
		onFulfilled?: OnFulfilled<Response, T>,
		onRejected?: OnRejected<R>,
	) {
		return this.check(this.raw).then(onFulfilled, onRejected);
	}
}

// The overload of `fetch` used in FetchClient.
type FetchFn = (request: Request, init: RequestInit) => Promise<Response>;

export interface FetchClientOptions {

	/**
	 * `baseURL` will be prepended to `url` if present.
	 */
	baseURL?: string;

	/**
	 * Check response status before retrieving data.
	 * By default, it rejects the promise if status is not 2xx.
	 */
	check?: Check;

	/**
	 * Use custom implementation instead of `global.fetch`.
	 */
	fetch?: FetchFn;

	/**
	 * Custom settings that you want to apply to each request.
	 */
	init?: RequestInit;
}

/**
 * A very simple helper to make `fetch` easier.
 *
 * # Alternatives
 * [redaxios](https://github.com/developit/redaxios)
 * [ky](https://github.com/sindresorhus/ky)
 * [axios](https://github.com/axios/axios)
 * [wretch](https://github.com/elbywan/wretch)
 */
export class FetchClient {

	// Allow extending FetchClient with inheritance.
	protected readonly init: RequestInit;
	protected readonly baseURL: string;
	protected readonly check: Check;
	protected readonly doFetch: FetchFn;

	constructor(options: FetchClientOptions = {}) {
		this.init = options.init ?? defaultRequest;
		this.baseURL = options.baseURL ?? "";
		this.check = options.check ?? checkStatus;
		this.doFetch = options.fetch ?? fetch;
	}

	request(url: string, method?: string, body?: any, params?: Params) {
		const { baseURL, init, check, doFetch } = this;
		const headers = new Headers(init.headers);

		/*
		 * We need to exclude undefined because it will be
		 * serialized to "xx=undefined" by URLSearchParams.
		 *
		 * See https://github.com/whatwg/url/issues/427
		 */
		if (params) {
			const searchParams = new URLSearchParams();
			for (const k of Object.keys(params)) {
				if (params[k] !== undefined)
					searchParams.set(k, params[k]);
			}
			url = `${url}?${searchParams}`;
		}

		// fetch will set content-type if body is some types.
		if (
			body && typeof body === "object" &&
			typeof body.append !== "function" &&
			typeof body.text !== "function"
		) {
			body = JSON.stringify(body);
			headers.set("content-type", "application/json");
		}

		const custom: RequestInit = { method, headers, body };
		const request = new Request(baseURL + url, init);
		return new ResponseFacade(doFetch(request, custom), check);
	}

	head(url: string, params?: Params) {
		return this.request(url, "HEAD", null, params);
	}

	get(url: string, params?: Params) {
		return this.request(url, "GET", null, params);
	}

	delete(url: string, params?: Params) {
		return this.request(url, "DELETE", null, params);
	}

	post(url: string, data?: any, params?: Params) {
		return this.request(url, "POST", data, params);
	}

	put(url: string, data?: any, params?: Params) {
		return this.request(url, "PUT", data, params);
	}

	patch(url: string, data?: any, params?: Params) {
		return this.request(url, "PATCH", data, params);
	}
}
