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
	let result = Number(v);

	for (let i = 0; i < units.length; i += 2) {
		if (units[i] === unit) {
			return result;
		} else {
			result *= units[i + 1];
		}
	}
	throw new Error(`Unknown unit: ${unit}B`);
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
	if (!Number.isFinite(value)) {
		throw new TypeError(`${value} is not a finite number`);
	}
	let i = TIME_UNITS.indexOf(unit);
	let d = 1;

	if (i === -1) {
		throw new Error(`Unknown duration unit: ${unit}`);
	}

	// Find index of the largest unit.
	for (; ; i += 2) {
		const x = d * TIME_UNITS[i + 1];
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
			groups.push(`${t}${TIME_UNITS[i]}`);
		}

		value %= d;
		d /= TIME_UNITS[i - 1];
	}

	return groups.length ? groups.join(" ") : `0${unit}`;
}

const re = /\d+([a-z]+)\s*/gi;

export function parseDuration(value: string, unit: TimeUnit) {
	const i = TIME_UNITS.indexOf(unit);
	if (i === -1) {
		throw new Error(`Unknown duration unit: ${unit}`);
	}

	let k = TIME_UNITS.length - 1;
	let seen = 0;
	let result = 0;

	for (const [matched, u] of value.matchAll(re)) {
		const j = TIME_UNITS.lastIndexOf(u, k);
		k = j - 2;

		if (j === -1) {
			throw new Error(TIME_UNITS.includes(u)
				? "Units must be ordered from largest to smallest"
				: `Unknown duration unit: ${u}`);
		}

		let n = parseFloat(matched);
		if (j > i) {
			for (let k = i; k < j; k += 2) {
				n *= TIME_UNITS[k + 1];
			}
		} else {
			for (let k = j; k < i; k += 2) {
				n /= TIME_UNITS[k + 1];
			}
		}
		result += n;
		seen += matched.length;
	}

	if (seen === value.length && seen > 0) {
		return result;
	}
	throw new Error(`Can not convert: "${value}" to duration`);
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
