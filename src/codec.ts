const htmlEscapes: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",

	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
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

/**
 * Reverse conversion of `escapeHTML`.
 *
 * Don't assign to `innerHTML` and retrieve by `textContent`,
 * is takes match time to build a DOM tree.
 */
export function unescapeHTML(html: string) {
	return html.replaceAll(/&(?:amp|lt|gt|quot|#39);/g, v => htmlEscapes[v]);
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

function toUint8(buffer: BufferSource) {
	return ArrayBuffer.isView(buffer)
		? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
		: new Uint8Array(buffer);
}

/**
 * Create an Url-Safe Base64 encoded ASCII string from a binary data.
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
export function base64url(buffer: BufferSource | Buffer) {
	if (typeof window === "undefined") {
		// Call `Buffer.from` with another Buffer will copy the data.
		if (!Buffer.isBuffer(buffer)) {
			buffer = Buffer.from(toUint8(buffer));
		}
		return buffer.toString("base64url");
	}
	/*
	 * Don't use `String.fromCharCode(...toUint8(buffer))`,
	 * It will cause stackoverflow if the buffer is larger than the stack.
	 */
	return toUint8(buffer as BufferSource)
		.toBase64({ alphabet: "base64url", omitPadding: true });
}

/**
 * Apply a transform to the buffer, avoiding some of the pitfalls:
 *
 * - Many instances use `new Blob([buffer])` or `new Response(buffer)` cause data copying.
 *   See benchmark/buffer-stream.ts for performance comparison.
 *
 * - The Promise returned by `tx.writable.getWriter().write(buffer)` may not be fulfilled
 *   until `tx.readable` is read. But if you don't await for it, you'll miss the exception.
 *
 * @example
 * // Compress & decompress with deflate-raw algorithm.
 * const buffer = Buffer.from(...);
 * const compress = new CompressionStream("deflate-raw");
 * const decompress = new DecompressionStream("deflate-raw");
 *
 * const zipped = await transformBuffer(buffer, compress);
 * const unzipped = await transformBuffer(zipped, decompress);
 *
 * @param buffer The binary data to be transformed.
 * @param tx A transform stream should apply to the buffer.
 */
export async function transformBuffer(buffer: BufferSource, tx: GenericTransformStream) {
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(buffer);
			controller.close();
		},
	});
	const readable = stream.pipeThrough(tx);
	return new Uint8Array(await new Response(readable).arrayBuffer());
}
