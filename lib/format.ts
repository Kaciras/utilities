export enum TimeUnit {
	NanoSecond = 0,
	MicroSecond = 2,
	MilliSecond = 4,
	Second = 6,
	Minute = 8,
	Hour = 10,
	Day = 12,
}

const TIME_UNITS = [
	"ns", 1000,
	"us", 1000,
	"ms", 1000,
	"s", 60,
	"m", 60,
	"h", 24,
	"d", Infinity,
];

const SIZE_UNITS_SI = [
	"", 1000,
	"K", 1000,
	"M", 1000,
	"G", 1000,
	"T", 1000,
	"P", 1000,
	"E", 1000,
	"Z", 1000,
	"Y", Infinity,
];

const SIZE_UNITS_IEC = [
	"", 1024,
	"K", 1024,
	"M", 1024,
	"G", 1024,
	"T", 1024,
	"P", 1024,
	"E", 1024,
	"Z", 1024,
	"Y", Infinity,
];

function toString(value: number, units: any[], uIndex: number) {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${value} is not a finite number`);
	}
	let v = Math.abs(value);

	for (; uIndex < units.length; uIndex += 2) {
		if (v < units[uIndex + 1])
			break;
		v /= units[uIndex + 1];
	}

	if (value < 0) v = -v;
	return `${Number(v.toFixed(2))} ${units[uIndex]}`;
}

function fromString(value: string, units: any[]) {
	const match = /^([-+0-9.]+)\s*(\w)?B$/.exec(value);
	if (!match) {
		throw new Error(`Can't parse: "${value}"`);
	}
	const [, v, unit = ""] = match;
	let sss = Number(v);

	for (let i = 0; i < units.length; i += 2) {
		if (units[i] === unit) {
			return sss;
		} else {
			sss *= units[i + 1];
		}
	}
	throw new Error("Unknown unit: " + unit);
}

export function formatDuration(value: number, unit: TimeUnit) {
	return toString(value, TIME_UNITS, unit);
}

/**
 * Convert bytes to a human-readable string.
 *
 * The result may lose precision and cannot be converted back.
 *
 * @param value The number to format.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function formatSize(value: number, fraction: 1024 | 1000 = 1024) {
	return `${toString(value, fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI, 0)}B`;
}

/**
 * Parse size string to number of bytes.
 *
 * @param value The size string.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function parseSize(value: string, fraction: 1024 | 1000 = 1024) {
	return fromString(value, fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI);
}
