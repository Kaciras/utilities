import { BinaryLike, createHash } from "crypto";
import { base64url } from "./codec.js";

/**
 * A convenient hash function using sha256.
 *
 * @param data the data to be digested.
 * @return Url-safe base64 encoded digest string.
 */
export async function sha256(data: BufferSource | BinaryLike) {
	if (typeof window === "undefined") {
		return createHash("sha256")
			.update(data as BinaryLike)
			.digest("base64url");
	}
	return base64url(await crypto.subtle.digest("SHA-256", data as BufferSource));
}
