/**
 * Fetch the resource into a File object.
 *
 * @param request This defines the resource that you wish to fetch.
 * @param init An object containing any custom settings that you want to apply to the request.
 */
export async function fetchFile(request: RequestInfo, init?: RequestInit) {
	const url = typeof request === "string" ? request : request.url;

	const response = await fetch(request, init);
	if (!response.ok) {
		throw new Error(`Failed to fetch (${response.status}) ${url}`);
	}

	const blob = await response.blob();
	const timeHeader = response.headers.get("last-modified");
	const lastModified = timeHeader ? new Date(timeHeader).getTime() : undefined;

	const name = new URL(url).pathname.split("/").at(-1) || "download";
	return new File([blob], name, { type: blob.type, lastModified });
}

export class FetchClientError extends Error {

	private readonly response: Response;
	private readonly code: number;

	constructor(response: Response) {
		super(`Fetch failed with status: ${response.status}`);
		this.response = response;
		this.code = response.status;
		this.name = "FetchClientError";
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

type OnFulfilled<T, R> = ((value: T) => R | PromiseLike<R>) | null;
type OnRejected<R> = ((reason: any) => R | PromiseLike<R>) | null;

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

export interface FetchClientOptions {
	baseURL?: string;
	check?: Check;
	init?: RequestInit;
}

/**
 * A very simple helper to make `fetch` easier.
 *
 * # Alternatives
 * [ky](https://github.com/sindresorhus/ky)
 * [axios](https://github.com/axios/axios)
 * [wretch](https://github.com/elbywan/wretch)
 */
export class FetchClient {

	private readonly init: RequestInit;
	private readonly baseURL: string;
	private readonly check: Check;

	constructor(options: FetchClientOptions = {}) {
		this.init = options.init ?? defaultRequest;
		this.baseURL = options.baseURL ?? "";
		this.check = options.check ?? checkStatus;
	}

	fetch(url: string, method?: string, data?: any, params?: Params) {
		const { baseURL, init, check } = this;

		// https://github.com/whatwg/url/issues/427
		if (params) {
			const searchParams = new URLSearchParams();
			for (const k of Object.keys(params)) {
				if (params[k] !== undefined)
					searchParams.set(k, params[k]);
			}
			url = `${url}?${searchParams}`;
		}

		const headers = new Headers(init.headers);
		const custom: RequestInit = { method, headers };

		// fetch will set content-type if body is some types.
		if (data instanceof FormData) {
			custom.body = data;
		} else if (data) {
			custom.body = JSON.stringify(data);
			headers.set("content-type", "application/json");
		}

		const request = new Request(new URL(url, baseURL), init);
		return new ResponseFacade(fetch(request, custom), check);
	}

	head(url: string, params?: Params) {
		return this.fetch(url, "HEAD", null, params);
	}

	get(url: string, params?: Params) {
		return this.fetch(url, "GET", null, params);
	}

	delete(url: string, params?: Params) {
		return this.fetch(url, "DELETE", null, params);
	}

	post(url: string, data?: any, params?: Params) {
		return this.fetch(url, "POST", data, params);
	}

	put(url: string, data?: any, params?: Params) {
		return this.fetch(url, "PUT", data, params);
	}

	patch(url: string, data?: any, params?: Params) {
		return this.fetch(url, "PATCH", data, params);
	}
}
