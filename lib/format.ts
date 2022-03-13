const SIZE_UNITS = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

/**
 * Convert bytes to a human-readable string.
 *
 * The result may lose precision and cannot be converted back.
 *
 * @param value The number to format.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function formatSize(value: number, fraction: 1024 | 1000 = 1024) {
	const size = Math.abs(value);

	if (size === 0) {
		return `${value} B`;
	}
	let exponent = ~~(Math.log2(size) / Math.log2(fraction));
	exponent = Math.min(exponent, SIZE_UNITS.length - 1);

	const v = value / (fraction ** exponent);

	return `${Number(v.toFixed(2))} ${SIZE_UNITS[exponent]}B`;
}

/**
 * Parse size string to number of bytes.
 *
 * @param value The size string.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function parseSize(value: string, fraction: 1024 | 1000 = 1024) {
	const match = /^([-+0-9.]+)\s*(\w)?B$/.exec(value);
	if (!match) {
		throw new Error(`Can not parse size: "${value}"`);
	}
	const [, v, u = ""] = match;
	return Number(v) * (fraction ** SIZE_UNITS.indexOf(u));
}
