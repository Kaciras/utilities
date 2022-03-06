export async function urlToFile(request: RequestInfo, init?: RequestInit) {
	const response = await fetch(request, init);
	const blob = await response.blob();

	const url = typeof request === "string" ? request : request.url;
	const name = new URL(url).pathname.split("/").pop() || "download";

	const timeHeader = response.headers.get("last-modified");
	const lastModified = timeHeader ? new Date(timeHeader).getTime() : undefined;

	return new File([blob], name, { type: blob.type, lastModified });
}
