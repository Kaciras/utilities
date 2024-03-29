const htmlEscapes: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/**
 * Escape special characters in the given string of text,
 * such that it can be interpolated in HTML content.
 *
 * # Alternatives
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
 *
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
 * # Alternatives
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
 * Create an Url-Safe Base64 encoded ASCII string from a binary data.
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
export function base64url(buffer: BufferSource | Buffer) {
	if (typeof window === "undefined") {
		// Call Buffer.from with another Buffer will copy data.
		if (!Buffer.isBuffer(buffer)) {
			buffer = Buffer.from(buffer as any);
		}
		return buffer.toString("base64url");
	}
	/*
	 * Don't use `String.fromCharCode(...new Uint8Array(buffer))`,
	 * It will cause stackoverflow if the buffer is larger than the stack.
	 */
	const bytes = new Uint8Array(buffer as any);
	const chars = Array.from(bytes, c => String.fromCodePoint(c));
	return btoa(chars.join("")).replaceAll(/[+/=]/g, v => urlSafeMap[v]);
}
