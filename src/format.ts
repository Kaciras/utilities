/*
 * There two ways to convert a value to another unit, division and modulo.
 * For example.
 * - Division conversion: "90s" to "1.5m".
 * - Modulo conversion:   "90s" to "1m 30s".
 */

//@formatter:off
const SIZE_UNITS_SI		= ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;
const DECIMAL_SYMBOLS	= ["",  "K",  "M",  "G",  "T",  "P",  "E",  "Z",  "Y"] as const;
const DECIMAL_FRACTIONS	= [ 1,  1e3,  1e6,  1e9,  1e12,  1e15, 1e18, 1e21, 1e24];

const SIZE_UNITS_IEC	= ["B", "KiB",  "MiB",  "GiB",  "TiB",  "PiB",  "EiB",  "ZiB",  "YiB"] as const;
const BINARY_FRACTIONS	= [ 1,  1024,   2**20,  2**30,  2**40,  2**50,  2**60,  2**70,  2**80];

const TIME_UNITS		= ["ns", "us", "ms", "s",  "m",   "h",   "d"] as const;
const TIME_FRACTIONS	= [ 1,   1e3,  1e6,  1e9,  6e10, 36e11, 864e11];
// @formatter:on

const groupRE = /[0-9.]+\s?([a-z]+)\s*/gi;

export class UnitConvertor<T extends readonly string[]> {

	private readonly name: string;
	private readonly space: string;

	/**
	 * Supported units of this convertor, from small to large.
	 */
	readonly units: T;

	/**
	 * Parallel array of `units`, containing the magnification
	 * relative to the smallest unit.
	 */
	readonly fractions: number[];

	constructor(name: string, units: T, fractions: number[], space = " ") {
		this.name = name;
		this.space = space;
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
	 *
	 * @example
	 * durationFmt.suit(1200_000);	// 2 (.units[2] === "ms")
	 * durationFmt.suit(0);			// 0 (.units[0] === "ns")
	 * durationFmt.suit(999e12);	// 6 (.units[6] === "d")
	 */
	suit(value: number) {
		const s = this.fractions;
		let i = 0;

		// When i outbound, (s[i] <= value) is false.
		while (s[i] <= value) i++;

		// (i = 0) when (value < 1), fallback to the minimum unit.
		return Math.max(0, i - 1);
	}

	/**
	 * Scale the number to the most appropriate unit and round.
	 *
	 * The result may lose precision and cannot be converted back.
	 *
	 * @example
	 * durationFmt.formatDiv(0.1, "ns");		// "0.1 ns"
	 * durationFmt.formatDiv(0, "s");			// "0 ns"
	 * durationFmt.formatDiv(97215, "s", 4);	// "1.1252 d"
	 * durationFmt.formatDiv(0.522, "h");		// "31.32 m"
	 * durationFmt.formatDiv(0.522, "h", 1);	// "31.3 m"
	 * durationFmt.formatDiv(0.522, "h", 99);	// "31.32 m"
	 *
	 * @param value Numeric value to use.
	 * @param unit Unit ot the value.
	 * @param precision The number of digits to appear after the decimal point.
	 */
	formatDiv(value: number, unit?: T[number], precision = 2) {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${value} is not a finite number`);
		}
		const { units, fractions } = this;
		let v = value * this.getFraction(unit);

		const i = this.suit(Math.abs(v));
		v /= fractions[i];

		return `${Number(v.toFixed(precision))}${this.space}${units[i]}`;
	}

	/**
	 * Formats a value with unit into multiple groups.
	 *
	 * The result may lose precision and cannot be converted back.
	 *
	 * @example
	 * durationFmt.formatMod(0.1, "ns");		// "0ns"
	 * durationFmt.formatMod(0, "s");			// "0s"
	 * durationFmt.formatMod(97215, "s", 4);	// "1d 3h 0m 15s"
	 * durationFmt.formatMod(0.522, "h");		// "31m 19s"
	 * durationFmt.formatMod(0.522, "h", 1);	// "31m"
	 * durationFmt.formatMod(0.522, "h", 99);	// "31m 19s 200ms"
	 *
	 * @param value Numeric value to use.
	 * @param unit Unit ot the value.
	 * @param parts Maximum number of groups in result.
	 */
	formatMod(value: number, unit?: T[number], parts = 2) {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${value} is not a finite number`);
		}
		const { units, fractions } = this;
		let v = Math.abs(value) * this.getFraction(unit);

		const groups: string[] = [];

		// Backtrace to calculate each group.
		for (let i = this.suit(v); i >= 0 && parts > 0; i--, parts -= 1) {
			const f = fractions[i];

			// Avoid tailing zeros.
			if (v * f < 1) break;

			const t = Math.floor(v / f);
			v %= f;
			groups.push(`${t}${units[i]}`);
		}

		const sign = value < 0 ? "-" : "";
		return groups.length ? sign + groups.join(" ") : `0${unit}`;
	}

	/**
	 * Convert string to number in specified unit.
	 *
	 * @example
	 * durationFmt.parse("10000d", "d");		// 10000
	 * durationFmt.parse("0h", "s");			// 0
	 * durationFmt.parse("0.5m", "s");			// 30
	 * durationFmt.parse("1d 3h 0m 15s", "s");	// 97215
	 * durationFmt.parse("+1d 3h 0m 15s", "s");	// 97215
	 * durationFmt.parse("-1d 3h 0m 15s", "s");	// -97215
	 *
	 * @param value The string to parse.
	 * @param unit Target unit to converted to.
	 */
	parse(value: string, unit?: T[number]) {
		const { name, units, fractions } = this;
		let k = Infinity;
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

		switch (value.charCodeAt(0)) {
			case 45: /* - */
				result = -result;
			// eslint-disable-next-line no-fallthrough
			case 43: /* + */
				seen += 1;
		}

		if (seen === value.length && seen > 0) {
			return result / this.getFraction(unit);
		}
		throw new Error(`Can not convert "${value}" to ${name}`);
	}
}

/**
 * Convert between duration and human-readable string.
 * Support units from nanoseconds to days.
 */
export const durationFmt = new UnitConvertor("time", TIME_UNITS, TIME_FRACTIONS);

/**
 * Convert between number and decimal prefixed number.
 *
 * @example
 * decimalPrefix.formatDiv(123456789); // 123.46M
 */
export const decimalPrefix = new UnitConvertor("decimal prefix", DECIMAL_SYMBOLS, DECIMAL_FRACTIONS, "");

/**
 * Convert between bytes and human-readable string using SI (1000) prefixes.
 */
export const dataSizeSI = new UnitConvertor("data size", SIZE_UNITS_SI, DECIMAL_FRACTIONS);

/**
 * Convert between bytes and human-readable string using IEC (1024) prefixes.
 */
export const dataSizeIEC = new UnitConvertor("data size", SIZE_UNITS_IEC, BINARY_FRACTIONS);

type EllipsisPos = "begin" | "mid" | "end";

/**
 * Truncates a string, insert or append an ellipsis at any desired position
 * of the truncated result.
 *
 * # Alternatives
 * [smart-truncate](https://github.com/millerized/smart-truncate)
 *
 * @param value The long string to truncate.
 * @param length The length of the truncated result, must greater than 1.
 * @param position The position of the ellipsis mark inserted to.
 */
export function ellipsis(value: string, length: number, position: EllipsisPos = "mid") {
	value = value.trim();

	if (value.length <= length) {
		return value;
	}
	let n = length - 1;

	switch (position.charCodeAt(0)) {
		case 101: /* e */
			return value.slice(0, n) + "…";
		case 98:  /* b */
			return "…" + value.slice(-n);
		case 109: /* m */
			n = Math.ceil(n / 2);
			return `${value.slice(0, n)}…${value.slice(-length + n + 1)}`;
	}

	throw new TypeError(`Invalid position: ${position}. supported (start|mid|end)`);
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
 * const template = "<html><head></head><body></body></html>";
 * const newComposite = compositor(template, {
 * 		bodyAttrs: /(?<=<body.*?)(?=>)/s,
 * 		appHtml: /(?<=<body.*?>).*(?=<\/body>)/s,
 * });
 *
 * const c = newComposite();
 * c.put("appHtml", "<div id='app'>...</div>");
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

		// noinspection SuspiciousTypeOfGuard (IDEA bug)
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
