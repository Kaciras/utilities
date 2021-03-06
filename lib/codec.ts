const htmlEscapes: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#039;",
};

/**
 * Escape special characters in the given string of text,
 * such that it can be interpolated in HTML content.
 *
 * <h2>Alternatives</h2>
 * To insert text into a DOM node, just assign `textContent`.
 */
export function escapeHTML(html: string) {
	return html.replaceAll(/[&<>"']/g, v => htmlEscapes[v]);
}

const svgEscapes: Record<string, string> = {
	'"': "'",
	"%": "%25",
	"#": "%23",
	"{": "%7B",
	"}": "%7D",
	"<": "%3C",
	">": "%3E",
};

/**
 * Escape an SVG string，make it available for data url, the result is more efficient than base64.
 * Double quotes will be replaced with single quotes.
 *
 * @example
 * const dataUrl = "data:image/svg+xml," + svgToUrl(svg);
 *
 * @see https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
 * @see https://www.zhangxinxu.com/wordpress/2018/08/css-svg-background-image-base64-encode/
 */
export function svgToUrl(svg: string) {
	return svg.replaceAll(/["%#{}<>]/g, v => svgEscapes[v]);
}

/**
 * Convert the Blob to base64-encoded data url string。
 *
 * <h1>Alternatives</h1>
 * If you don't need serialization, use `URL.createObjectURL` for better performance.
 */
export function blobToBase64URL(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = reject;
		reader.onloadend = () => resolve(reader.result as string);
		reader.readAsDataURL(blob);
	});
}

const urlSafeMap: Record<string, string> = {
	"=": "",
	"/": "_",
	"+": "-",
};

/**
 * creates an Url-Safe Base64 encoded ASCII string from a binary data.
 */
export function base64url(buffer: Uint8Array | ArrayBuffer | Buffer) {
	if (typeof window === "undefined") {
		if (!Buffer.isBuffer(buffer)) {
			buffer = Buffer.from(buffer);
		}
		return buffer.toString("base64url");
	}
	const str = String.fromCharCode(...new Uint8Array(buffer));
	return btoa(str).replaceAll(/[+/=]/g, v => urlSafeMap[v]);
}
