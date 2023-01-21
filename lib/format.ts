/*
 * There two ways to convert a value to another unit, division and modulo.
 * For example.
 * - Division conversion: "90s" to "1.5m".
 * - Modulo conversion: "90s" to "1m 30s".
 *
 * The n2s and s2n means "number to string" and "string to number".
 *
 * All conversion functions take a unit argument, which is an array of
 * length 2N containing the N units from smallest to largest, and
 * the multiplier to the next unit.
 * e.g.
 * [
 *     "second", 60,		// 60 seconds is a minute.
 *     "minute", 60,		// 60 minute is a hour.
 *     "hour", Infinity,	// No more units, the multiplier is infinity.
 * ]
 */

function n2sDivision(units: any[], value: number, uIndex: number) {
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

const divRE = /^([-+0-9.]+)\s*(\w+)$/;

function s2nDivision(units: any[], value: string) {
	const match = divRE.exec(value);
	if (!match) {
		throw new Error(`Can't parse: "${value}"`);
	}
	const [, v, unit = ""] = match;
	let result = Number(v);

	for (let i = 0; i < units.length; i += 2) {
		if (units[i] === unit) {
			return result;
		} else {
			result *= units[i + 1];
		}
	}
	throw new Error(`Unknown unit: ${unit}`);
}

function n2sModulo(units: any[], value: number, unit: string, parts = 2) {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${value} is not a finite number`);
	}
	if (value < 0) {
		throw new Error(`value (${value}) can not be negative`);
	}

	let i = units.indexOf(unit);
	let d = 1;

	if (i === -1) {
		throw new Error(`Unknown unit: ${unit}`);
	}

	// Find index of the largest unit.
	for (; ; i += 2) {
		const x = d * units[i + 1];
		if (value < x) break; else d = x;
	}

	const groups: string[] = [];

	// Backtrace to calculate each group.
	for (;
		// 1.16e-14 = 1/24/60/60/1000/1000/1000
		i >= 0 && parts > 0 && value > 1.16e-14;
		i -= 2, parts -= 1
	) {
		const t = Math.floor(value / d);

		// Avoid leading zeros.
		if (groups.length || t !== 0) {
			groups.push(`${t}${units[i]}`);
		}

		value %= d;
		d /= units[i - 1];
	}

	return groups.length ? groups.join(" ") : `0${unit}`;
}

const groupRE = /\d+([a-z]+)\s*/gi;

function s2nModulo(units: any[], value: string, unit: string) {
	const i = units.indexOf(unit);
	if (i === -1) {
		throw new Error(`Unknown unit: ${unit}`);
	}

	let k = units.length - 1;
	let seen = 0;
	let result = 0;

	for (const [matched, u] of value.matchAll(groupRE)) {
		const j = units.lastIndexOf(u, k);
		k = j - 2;

		if (j === -1) {
			throw new Error(units.includes(u)
				? "Units must be ordered from largest to smallest"
				: `Unknown unit: ${u}`);
		}

		let n = parseFloat(matched);
		if (j > i) {
			for (let k = i; k < j; k += 2) {
				n *= units[k + 1];
			}
		} else {
			for (let k = j; k < i; k += 2) {
				n /= units[k + 1];
			}
		}
		result += n;
		seen += matched.length;
	}

	if (seen === value.length && seen > 0) {
		return result;
	}
	throw new Error(`Can not parse: "${value}"`);
}

type TimeUnit = "ns" | "ms" | "s" | "m" | "h" | "d";

const TIME_UNITS: any[] = [
	"ns", 1000,
	"us", 1000,
	"ms", 1000,
	"s", 60,
	"m", 60,
	"h", 24,
	"d", Infinity,
];

/**
 * Convert the given duration in to a human-readable format.
 * Support units from nanoseconds to days.
 *
 * @example
 * formatDuration(0, "s");			// "0s"
 * formatDuration(10000, "d");		// "10000d"
 * formatDuration(97215, "s", 4);	// "1d 3h 0m 15s"
 * formatDuration(0.522, "h");		// "31m 19s"
 * formatDuration(0.522, "h", 1);	// "31m"
 * formatDuration(0.522, "h", 999);	// "31m 19s 200ms"
 *
 * @param value Numeric value to use.
 * @param unit Unit ot the value.
 * @param parts Maximum number of groups in result.
 */
export function formatDuration(value: number, unit: TimeUnit, parts = 2) {
	return n2sModulo(TIME_UNITS, value, unit, parts);
}

/**
 * Convert duration string to number in specified unit.
 *
 * @example
 * parseDuration("10000d", "d");		// 10000
 * parseDuration("0h", "s");			// 0
 * parseDuration("0.5m", "s");			// 30
 * parseDuration("1d 3h 0m 15s", "s");	// 97215
 *
 * @param value The string to parse.
 * @param unit Target unit to converted to.
 */
export function parseDuration(value: string, unit: TimeUnit) {
	return s2nModulo(TIME_UNITS, value, unit);
}

const SIZE_UNITS_SI = [
	"B", 1000,
	"KB", 1000,
	"MB", 1000,
	"GB", 1000,
	"TB", 1000,
	"PB", 1000,
	"EB", 1000,
	"ZB", 1000,
	"YB", Infinity,
];

const SIZE_UNITS_IEC = [
	"B", 1024,
	"KB", 1024,
	"MB", 1024,
	"GB", 1024,
	"TB", 1024,
	"PB", 1024,
	"EB", 1024,
	"ZB", 1024,
	"YB", Infinity,
];

/**
 * Convert bytes to a human-readable string.
 *
 * The result may lose precision and cannot be converted back.
 *
 * @param value The number to format.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function formatSize(value: number, fraction: 1024 | 1000 = 1024) {
	return `${n2sDivision(fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI, value, 0)}`;
}

/**
 * Parse size string to number of bytes.
 *
 * @param value The size string.
 * @param fraction 1000 for SI or 1024 for IEC.
 */
export function parseSize(value: string, fraction: 1024 | 1000 = 1024) {
	return s2nDivision(fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI, value);
}

type Placeholders = Record<string, string | RegExp>;

/**
 * A simple string template engine, only support replace placeholders.
 *
 * It 10x faster than String.replaceAll() by splits the string ahead of time.
 *
 * # Alternatives
 * [mustache.js](https://github.com/janl/mustache.js)
 *
 * @example
 * const template = "<html>...</html>";
 * const newComposite = compositor(template, {
 * 		metadata: "<!--ssr-metadata-->",
 * 		bodyAttrs: /(?<=<body.*?)(?=>)/s,
 * 		appHtml: /(?<=<body.*?>).*(?=<\/body>)/s,
 * });
 *
 * const c = newComposite();
 * c.put("appHtml", "<div id='app'>...</div>");
 * c.put("metadata", "<meta...>");
 * c.put("bodyAttrs", " class='ssr dark'");
 * return composite.toString();
 *
 * @param template The template string
 * @param placeholders An object contains placeholders with its name as key.
 */
export function compositor<T extends Placeholders>(
	template: string,
	placeholders: T,
) {
	const nameToSlot = new Map<keyof T, number>();
	const positions = [];

	for (const name of Object.keys(placeholders)) {
		const pattern = placeholders[name];
		let startPos: number;
		let endPos: number;

		if (typeof pattern === "string") {
			startPos = template.indexOf(pattern);
			if (startPos === -1) {
				throw new Error("No match for: " + pattern);
			}
			endPos = startPos + pattern.length;
		} else {
			const match = pattern.exec(template);
			if (!match) {
				throw new Error("No match for: " + pattern);
			}
			startPos = match.index;
			endPos = startPos + match[0].length;
		}

		positions.push({ name, startPos, endPos });
	}

	// Sort by start position so we can check for overlap.
	positions.sort((a, b) => a.startPos - b.startPos);

	let lastEnd = 0;
	const parts: string[] = [];

	for (let i = 0; i < positions.length; i++) {
		const { name, startPos, endPos } = positions[i];
		nameToSlot.set(name, i * 2 + 1);

		if (startPos < lastEnd) {
			throw new Error("Placeholder overlapped.");
		}

		parts.push(template.slice(lastEnd, startPos));
		parts.push(template.slice(startPos, lastEnd = endPos));
	}

	parts.push(template.slice(lastEnd));

	return () => new Composite<T>(nameToSlot, [...parts]);
}

export class Composite<T extends Placeholders> {

	private readonly nameToSlot: Map<keyof T, number>;
	private readonly parts: string[];

	constructor(nameToSlot: Map<keyof T, number>, parts: string[]) {
		this.parts = parts;
		this.nameToSlot = nameToSlot;
	}

	toString() {
		return this.parts.join("");
	}

	put(name: keyof T, value: string) {
		this.parts[this.nameToSlot.get(name)!] = value;
	}
}
