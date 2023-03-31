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

type BufferOrString = BufferSource | string;

function toBuf(value: BufferOrString) {
	return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

interface AESOptions {

	/**
	 * @default 128
	 */
	length?: 128 | 256;

	/**
	 * @default AESHelper.DEFAULT_IV
	 */
	iv?: BufferSource;

	/**
	 * @default AESHelper.DEFAULT_SALT
	 */
	salt?: BufferOrString;

	/**
	 * @default 240537
	 */
	iterations?: number;
}

/**
 *
 * Currently WebCrypto does not support streams. Further reading:
 * https://github.com/w3c/webcrypto/issues/73
 *
 * On browser, this class is available only in secure contexts (HTTPS).
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 */
export class AESHelper {

	private static DEFAULT_SALT = new Uint32Array([
		0xaf9a9c5c, 0x8200982d, 0x90f46814, 0xf7008542,
		0xe7fb5613, 0xc6b73dc1, 0x00008be5, 0x1eeb367d,
	]);

	private static DEFAULT_IV = new Uint32Array([
		0x7f110357, 0xaf05541a, 0x36463f73, 0x0df21a80,
		0xfd1b00fb, 0x6e99d1c4, 0xac27a23f, 0x2aef0aeb,
	]);

	static async withPassword(password: BufferOrString, options: AESOptions = {}) {
		const {
			iv = AESHelper.DEFAULT_IV,
			length = 128,
			iterations = 240537,
			salt = AESHelper.DEFAULT_SALT,
		} = options;

		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			toBuf(password),
			"PBKDF2",
			false,
			["deriveKey"]);

		const key = await crypto.subtle.deriveKey({
			name: "PBKDF2",
			hash: "SHA-512",
			salt: toBuf(salt),
			iterations,
		}, keyMaterial, {
			name: "AES-GCM",
			length,
		}, false, ["encrypt", "decrypt"]);

		return new AESHelper({ name: "AES-GCM", iv }, key);
	}

	private readonly algorithm: AesGcmParams;
	private readonly key: CryptoKey;

	private constructor(algorithm: AesGcmParams, key: CryptoKey) {
		this.key = key;
		this.algorithm = algorithm;
	}

	async encrypt(input: BufferOrString) {
		return await crypto.subtle.encrypt(this.algorithm, this.key, toBuf(input));
	}

	async decrypt(input: BufferSource) {
		return crypto.subtle.decrypt(this.algorithm, this.key, input);
	}

	async decryptText(input: BufferSource) {
		return this.decrypt(input).then(b => new TextDecoder().decode(b));
	}
}
