import { describe, expect, it } from "@jest/globals";
import { compositor, formatDuration, formatSize, parseSize } from "../lib/format.js";

describe("formatSize", () => {
	const invalid = [
		Infinity,
		NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	];

	it.each(invalid)("should throws on invalid input %#", (input) => {
		expect(() => formatSize(input)).toThrow(TypeError(`${input} is not a finite number`));
	});

	const cases: Array<[number, string]> = [
		[0, "0 B"],
		[0.7, "0.7 B"],
		[10.1, "10.1 B"],
		[1023, "1023 B"],
		[1025, "1 KB"],
		[1.2089258196146292e+24, "1 YB"],

		[-0, "0 B"],
		[-0.7, "-0.7 B"],
		[-10.1, "-10.1 B"],
		[-1023, "-1023 B"],
		[-1025, "-1 KB"],
	];
	it.each(cases)("should format bytes %s", (number, string) => {
		expect(formatSize(number)).toBe(string);
	});

	it.each([
		[1e30, "1000000 YB"],
	])("should format bytes %s in SI", (number, string) => {
		expect(formatSize(number, 1000)).toBe(string);
	});
});

describe("parseSize", () => {
	const invalid = [
		"",
		"foobar",
		" 1023 B",
		"1023 B ",
	];
	it.each(invalid)("should throws on invalid input %#", (input) => {
		expect(() => parseSize(input)).toThrow(new Error(`Can't parse: "${input}"`));
	});

	it("should throw on unknown unit", () => {
		expect(() => parseSize("1023 SB")).toThrow(new Error("Unknown unit: SB"));
	});

	const cases: Array<[number, string]> = [
		[0, "0 B"],
		[0.7, "0.7 B"],
		[10.1, "10.1 B"],
		[1023, "1023 B"],
		[1023, "1023B"],
		[1023, "+1023B"],
		[1024, "1 KB"],
		[1.2089258196146292e+24, "1 YB"],

		[-0.7, "-0.7 B"],
		[-10.1, "-10.1 B"],
		[-1023, "-1023B"],
	];
	it.each(cases)("should parse bytes %s", (number, string) => {
		expect(parseSize(string)).toBe(number);
	});

	it("should parse the value in SI", () => {
		expect(parseSize("1023 MB", 1000)).toBe(1023_000_000);
	});
});

describe("formatDuration", () => {

	it("should throw with invalid unit", () => {
		// @ts-expect-error
		expect(() => formatDuration(11, "foobar")).toThrow(new Error("Unknown time unit: foobar"));
	});

	const cases: Array<[number, any, string]> = [
		[60, "s", "1m"],
		[1234, "s", "20m 34s"],
		[97215, "s", "1d 3h"],
		[22, "ns", "22ns"],
		[10000, "d", "10000d"],

		[0, "ns", "0ns"],
		[0, "h", "0h"],
		[0.5, "h", "30m"],
	];
	it.each(cases)("should works %#", (number, unit, expected) => {
		expect(formatDuration(number, unit)).toBe(expected);
	});

	it("should support custom part count", () => {
		expect(formatDuration(97215, "s", 4)).toBe("1d 3h 0m 15s");
		expect(formatDuration(0.522, "h", 99)).toBe("31m 19s 200ms");
	});
});

describe("compositor", () => {
	const template = "AABBCC_DD_EEFF_GG_HHII_JJKK";

	it.each([
		[new RegExp("bar"), "No match for: /bar/"],
		[/bar/, "No match for: /bar/"],
		["bar", "No match for: bar"],
	])("should throw error if placeholder not found", (pattern, error) => {
		expect(() => compositor(template, { pattern })).toThrow(new Error(error));
	});

	it("should throw error if placeholders are overlapped", () => {
		const p = {
			foo: /_DD.*_GG/,
			bar: /FF_.*_JJ/,
		};
		expect(() => compositor(template, p)).toThrow(new Error("Placeholder overlapped."));
	});

	it("should composite strings", () => {
		const create = compositor(template, {
			bar: /HHII/,
			foo: "CC_DD_EE",
		});
		const composite = create();
		composite.put("foo", "123");
		composite.put("bar", "456");

		expect(composite.toString()).toBe("AABB123FF_GG_456_JJKK");
	});

	it("should work with zero-width patterns", () => {
		const create = compositor(template, {
			foo: /(?<=EE)(?=FF)/,
			bar: /(?<=EE)(?=FF)/,
		});
		const composite = create();
		composite.put("foo", "123");
		composite.put("bar", "456");
		expect(composite.toString()).toBe("AABBCC_DD_EE123456FF_GG_HHII_JJKK");
	});
});
