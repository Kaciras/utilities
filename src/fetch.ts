import { identity, OnFulfilled, OnRejected } from "./lang.js";

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

type Check = (promise: Promise<Response>) => Promise<Response>;

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
 * // Get the response body in JSON format.
 * const data = await client.get(...).json<Type>();
 *
 * // Get raw response without status checking.
 * const response = await client.get(...).unchecked;
 *
 * // Get the Location header.
 * const location = await apiService.get(...).location;
 */
export class ResponseFacade implements Promise<Response> {

	private readonly raw: Promise<Response>;
	private readonly check: Check;

	constructor(raw: Promise<Response>, check: Check) {
		this.raw = raw;
		this.check = check;
	}

	/**
	 * Get the ResponseFacade for the same response, without any checks.
	 */
	get unchecked() {
		return new ResponseFacade(this.raw, identity);
	}

	/**
	 * Convenience method for status checking, resolved to true if the response
	 * status is equals to the value, otherwise false.
	 *
	 * Note: The status may be checked before and throw an error,
	 * to avoid this you can use `.unchecked.hasStatus(...)`.
	 */
	hasStatus(value: number) {
		return this.then(x => x.status === value);
	}

	/**
	 * Convenience method for parse the JSON body.
	 *
	 * Advantages over Response.json():
	 * 1) Prefer generic `res.json<T>()` over casting `res.json() as T`.
	 * 2) Using this method can reduce one then/await call.
	 */
	json<T = any>(): Promise<T> {
		return this.then(x => x.json());
	}

	get location(): Promise<string> {
		return this.then(x => x.headers.get("location")!);
	}

	get [Symbol.toStringTag]() {
		return "ResponseFacade";
	}

	catch<E = never>(onRejected: OnRejected<E>) {
		return this.check(this.raw).catch(onRejected);
	}

	finally(onFinally?: (() => void) | null): Promise<Response> {
		return this.check(this.raw).finally(onFinally);
	}

	then<T = Response, R = never>(
		onFulfilled?: OnFulfilled<Response, T>,
		onRejected?: OnRejected<R>,
	) {
		return this.check(this.raw).then(onFulfilled, onRejected);
	}
}

/**
 * The overload of `fetch` that parameters are not undefined.
 */
type ResolvedFetch = (request: Request, init: RequestInit) => Promise<Response>;

type Params = Record<string, any>;

const defaultRequest: RequestInit = {
	credentials: "include",
};

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
	fetch?: ResolvedFetch;

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
	protected readonly doFetch: ResolvedFetch;

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
