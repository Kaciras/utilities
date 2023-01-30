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

//@formatter:off
const SIZE_UNITS			= ["B", "KB",  "MB",  "GB",  "TB",  "PB",  "EB",  "ZB",  "YB"] as const;
const SIZE_FRACTIONS_SI		= [ 1,  1e3,   1e6,   1e9,   1e12,  1e15,  1e18,  1e21,  1e24];
const SIZE_FRACTIONS_IEC	= [ 1,  2**10, 2**20, 2**30, 2**40, 2**50, 2**60, 2**70, 2**80];

const TIME_UNITS			= ["ns", "us", "ms", "s",  "m",   "h",   "d"] as const;
const TIME_FRACTIONS		= [ 1,   1e3,  1e6,  1e9,  6e10, 36e11, 864e11];
// @formatter:on

const divRE = /^([-+0-9.]+)\s*(\w+)$/;
const groupRE = /\d+([a-z]+)\s*/gi;

export class UnitConvertor<T extends readonly string[]> {

	private readonly name: string;
	private readonly units: T;
	private readonly fractions: number[];

	constructor(name: string, units: T, fractions: number[]) {
		this.name = name;
		this.units = units;
		this.fractions = fractions;
	}

	/**
	 * Get the fraction of the unit, throw error if the unit is invalid.
	 */
	private getFraction(unit?: string) {
		if (unit === undefined) {
			return 1;
		}
		const { units, name, fractions } = this;
		const i = units.indexOf(unit);
		if (i !== -1) {
			return fractions[i];
		}
		throw new Error(`Unknown ${name} unit: ${unit}`);
	}

	/**
	 * Find the index of the largest fraction that is less than the value.
	 */
	private largest(value: number) {
		const s = this.fractions;
		let i = 0;
		while (s[i] <= value && i < s.length) i++;
		return Math.max(0, i - 1);
	}

	/**
	 * The result may lose precision and cannot be converted back.
	 *
	 * @param value
	 * @param unit
	 * @param precision
	 */
	n2sDivision(value: number, unit?: T[number], precision = 2) {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${value} is not a finite number`);
		}
		const { units, fractions } = this;
		let v = Math.abs(value) * this.getFraction(unit);

		const i = this.largest(v);
		v /= fractions[i];

		// TODO: Is Math.sign better?
		if (value < 0) v = -v;
		return `${Number(v.toFixed(precision))} ${units[i]}`;
	}

	s2nDivision(value: string, target?: T[number]) {
		const { name } = this;
		const match = divRE.exec(value);
		if (!match) {
			throw new Error(`Can not convert "${value}" to ${name}`);
		}
		const [, v, unit] = match;

		return Number(v) * this.getFraction(unit) / this.getFraction(target);
	}

	n2sModulo(value: number, unit?: T[number], parts = 2) {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${value} is not a finite number`);
		}
		if (value < 0) {
			throw new Error(`value (${value}) can not be negative`);
		}
		const { units, fractions } = this;
		value *= this.getFraction(unit);

		const groups: string[] = [];
		let i = this.largest(value);

		// Backtrace to calculate each group.
		for (; i >= 0 && parts > 0; i--, parts -= 1) {
			const f = fractions[i];

			// Avoid tailing zeros.
			if (value * f < 1) break;

			const t = Math.floor(value / f);
			value %= f;
			groups.push(`${t}${units[i]}`);
		}

		return groups.length ? groups.join(" ") : `0${unit}`;
	}

	s2nModulo(value: string, unit: T[number]) {
		const { name, units, fractions } = this;
		let k = units.length - 1;
		let seen = 0;
		let result = 0;

		for (const [matched, u] of value.matchAll(groupRE)) {
			const i = units.lastIndexOf(u, k);
			k = i - 1;

			if (i === -1) {
				throw new Error(units.includes(u)
					? "Units must be ordered from largest to smallest"
					: `Unknown ${name} unit: ${u}`);
			}

			seen += matched.length;
			result += parseFloat(matched) * fractions[i];
		}

		if (seen === value.length && seen > 0) {
			return result / this.getFraction(unit);
		}
		throw new Error(`Can not convert "${value}" to ${name}`);
	}
}

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

export const durationConvertor = new UnitConvertor("time", TIME_UNITS, TIME_FRACTIONS);

/**
 * Convert between bytes and human-readable string using SI prefixes.
 */
export const dataSizeSI = new UnitConvertor("data size", SIZE_UNITS, SIZE_FRACTIONS_SI);

/**
 * Convert between bytes and human-readable string using IEC prefixes.
 */
export const dataSizeIEC = new UnitConvertor("data size", SIZE_UNITS, SIZE_FRACTIONS_IEC);

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
