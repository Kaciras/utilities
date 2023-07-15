import { base64url } from "./codec.js";

type BufferOrString = BufferSource | string;

function toBuf(value: BufferOrString) {
	return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

/**
 * A convenient hash function using SHA-256.
 *
 * @param data the data to be digested.
 * @return Url-safe base64 encoded digest string.
 */
export function sha256(data: BufferOrString) {
	return crypto.subtle.digest("SHA-256", toBuf(data)).then(base64url);
}

interface AESOptions {

	/**
	 * AES key size, can be 128, 192, or 256.
	 *
	 * @default 128
	 */
	length?: 128 | 192 | 256;

	/**
	 * GCM initialization vector.
	 *
	 * @default AESHelper.DEFAULT_IV
	 */
	iv?: BufferSource;

	/**
	 * @default AESHelper.DEFAULT_SALT
	 */
	salt?: BufferOrString;

	/**
	 * Number of iterations used for PBKDF2.
	 *
	 * @default 240537
	 */
	iterations?: number;
}

/**
 * A simple WebCrypto wrapper for symmetric encryption with sensible defaults.
 *
 * Currently, WebCrypto does not support streams. Further reading:
 * https://github.com/w3c/webcrypto/issues/73
 *
 * On browser, this class is only available in secure contexts (HTTPS).
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 *
 * @example
 * const aes = await AESHelper.withPassword("foobar");
 * const encrypted = await aes.encrypt("123456");
 * const plain = await aes.decryptText(encrypted); // "123456"
 */
export class AESHelper {

	// Default salt and IV are randomly generated.

	static readonly DEFAULT_SALT = new Uint32Array([
		0xaf9a9c5c, 0x8200982d, 0x90f46814, 0xf7008542,
		0xe7fb5613, 0xc6b73dc1, 0x00008be5, 0x1eeb367d,
	]);
	static readonly DEFAULT_IV = new Uint32Array([
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

	/**
	 * Decrypt data and convert it to string using utf8 encoding.
	 */
	async decryptText(input: BufferSource) {
		return this.decrypt(input).then(b => new TextDecoder().decode(b));
	}
}
