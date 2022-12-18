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

type BodyHandler<T> = (response: Response) => T | Promise<T>;

async function jsonBodyHandler(response: Response) {
	if (response.ok) {
		return response.json();
	}
	let message = await response.text();
	if (!message) {
		message = response.statusText;
	}
	throw new FetchClientError(response, message);
}

async function check(response: Response) {
	if (response.ok) {
		return response;
	}
	throw new FetchClientError(response);
}

type OnFulfilled<T, R> = ((value: T) => R | PromiseLike<R>) | null;
type OnRejected<R> = ((reason: any) => R | PromiseLike<R>) | null;

/**
 * 对 Promise<Response> 的封装，提供默认的检查机制和一些额外的功能。
 *
 * 为了 API 函数调用的简洁，设计上大部分是直接返回响应体，但也有获取头部和原始响应对象的。
 * 对此就需要一个简便的方式来获取响应的各个部分，也就有了这个封装。
 *
 * <h2>用法</h2>
 * @example
 * // 该类实现了 Promise<Response>，可以直接 await
 * try {
 *     const res = await apiService.get(...);
 * } catch(e) {
 *     console.error(e.message);
 * }
 *
 * // 直接 await 会检查响应的状态码，如果不想检查请使用 raw 属性
 * const unchecked = await apiService.get(...).raw;
 *
 * // 只关心响应体则使用 data 属性
 * const data = await apiService.get(...).data;
 *
 * // 使用 location 来获取 Location 头
 * const location = await apiService.get(...).location;
 */
export class ResponseFacade implements Promise<Response> {

	readonly raw: Promise<Response>;

	constructor(raw: Promise<Response>) {
		this.raw = raw;
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
		return this.raw.then(check).catch(onRejected);
	}

	finally(onFinally?: any): Promise<Response> {
		return this.raw.then(check).finally(onFinally);
	}

	// 不能偷懒直接用 ...args 作为参数，否则调用方会报 TS1230 错误。
	then<T = Response, R = never>(
		onFulfilled?: OnFulfilled<Response, T>,
		onRejected?: OnRejected<R>,
	) {
		return this.raw.then(check).then(onFulfilled, onRejected);
	}
}

export class FetchClient {

	private readonly init: RequestInit;
	private readonly baseURL: string;

	constructor(baseURL = "", init = defaultRequest) {
		this.init = init;
		this.baseURL = baseURL;
	}

	fetch(url: string, method?: string, data?: any, params?: Params) {
		const { baseURL, init } = this;

		if (params) {
			// https://github.com/whatwg/url/issues/427
			for (const k of Object.keys(params)) {
				if (params[k] === undefined)
					delete params[k];
			}
			url = `${url}?${new URLSearchParams(params)}`;
		}

		const headers = new Headers(init.headers);
		const custom: RequestInit = { method, headers };

		// body 为 FormData 时会自动设置 Content-Type。
		if (data instanceof FormData) {
			custom.body = data;
		} else if (data) {
			custom.body = JSON.stringify(data);
			headers.set("content-type", "application/json");
		}

		const request = new Request(new URL(url, baseURL), init);
		return new ResponseFacade(fetch(request, custom));
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
