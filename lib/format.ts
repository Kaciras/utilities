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

export function formatDuration(value: number, unit: TimeUnit, parts = 2) {
	let i = TIME_UNITS.indexOf(unit);
	let d = 1;

	if (i === -1) {
		throw new Error(`Unknown time unit: ${unit}`);
	}

	for (; ; i += 2) {
		const x = d * TIME_UNITS[i + 1];
		if (value < x) break; else d = x;
	}

	const groups: string[] = [];

	// 1.16e-14 = 1/24/60/60/1000...
	for (;
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
