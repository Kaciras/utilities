import { base64url } from "./codec.js";

/**
 * 方便的 Hash 函数，接受字节类数据，输出 base64url 字符串。
 *
 * @param data 数据
 * @return Hash 字符串
 */
export async function sha256(data: BufferSource) {
	return base64url(await crypto.subtle.digest("SHA-256", data));
}
