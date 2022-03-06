const SIZE_UNITS = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

/**
 * Convert bytes to a human-readable string.
 *
 * @param value The number to format.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function formatSize(value: number, fraction: 1024 | 1000 = 1024) {
	const size = Math.abs(value);

	if (size === 0) {
		return `${value.toFixed(2)} B`;
	}

	const i = ~~(Math.log2(size) / Math.log2(fraction));
	const v = value / (fraction ** i);
	return `${v.toFixed(2)} ${SIZE_UNITS[i]}B`;
}

/**
 *
 *
 * @param value
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function parseSize(value: string, fraction: 1024 | 1000 = 1024) {

}
