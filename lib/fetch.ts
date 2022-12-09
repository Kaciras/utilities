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
	private readonly data: any;

	constructor(response: Response, data: any, message: string) {
		super(message);
		this.data = data;
		this.response = response;
	}
}

type Params = Record<string, any>;

const defaultRequest: RequestInit = {
	credentials: "include",
	headers: {
		"accept": "application/json",
	},
};

export class FetchClient {

	private readonly init: RequestInit;
	private readonly baseURL: string;

	constructor(baseURL = "", init = defaultRequest) {
		this.init = init;
		this.baseURL = baseURL;
	}

	async fetch<T>(url: string, method?: string, data?: any, params?: Params) {
		const { baseURL, init } = this;
		const custom: RequestInit = {};

		if (params) {
			// https://github.com/whatwg/url/issues/427
			for (const k of Object.keys(params)) {
				if (params[k] === undefined)
					delete params[k];
			}
			url = `${url}?${new URLSearchParams(params)}`;
		}

		// body 为 FormData 时会自动设置 Content-Type。
		if (data instanceof FormData) {
			custom.body = data;
		} else if (data) {
			init.body = JSON.stringify(data);
			custom.headers = { "content-type": "application/json" };
		}

		const request = new Request(new URL(url, baseURL), init);
		const response = await fetch(request, custom);

		if (response.ok) {
			return await response.json() as T;
		}

		let message = await response.text();
		if (!message) {
			message = response.statusText;
		}
		throw new FetchClientError(response, data, message);
	}

	head(url: string, params?: Params) {
		return this.fetch<void>("HEAD", url, null, params);
	}

	get<R = void>(url: string, params?: Params) {
		return this.fetch<R>("GET", url, null, params);
	}

	delete<R = void>(url: string, params?: Params) {
		return this.fetch<R>("DELETE", url, null, params);
	}

	post<R = void>(url: string, data?: any, params?: Params) {
		return this.fetch<R>("POST", url, data, params);
	}

	put<R = void>(url: string, data?: any, params?: Params) {
		return this.fetch<R>("PUT", url, data, params);
	}

	patch<R = void>(url: string, data?: any, params?: Params) {
		return this.fetch<R>("PATCH", url, data, params);
	}
}
