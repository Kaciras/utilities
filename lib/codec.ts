const escapes: Record<string, string> = {
	'"': "'",
	"%": "%25",
	"#": "%23",
	"{": "%7B",
	"}": "%7D",
	"<": "%3C",
	">": "%3E",
};

/**
 * 将 SVG 的部分字符转义，让其可以用于 URL，使用了比 Base64 更高效的编码。
 * 双引号将被替换为单引号，将结果用于 DOM 属性或 CSS 里的 url() 时需要注意外层引号。
 *
 * @example
 * const dataUrl = "data:image/svg+xml," + svgToUrl(svg);
 *
 * @see https://www.zhangxinxu.com/wordpress/2018/08/css-svg-background-image-base64-encode/
 */
export function svgToUrl(code: string) {
	return code.replaceAll(/["%#{}<>]/g, v => escapes[v]);
}

/**
 * 将 Blob 对象转为 base64 编码的 Data-URL 字符串。
 *
 * 【其他方案】
 * 如果可能，使用 URL.createObjectURL + URL.revokeObjectURL 性能更好。
 *
 * @param blob Blob对象
 * @return Data-URL 字符串
 */
export function blobToBase64URL(blob: Blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = reject;
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(blob);
	});
}

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
	return btoa(str).replaceAll("/", "_").replaceAll("+", "-");
}
