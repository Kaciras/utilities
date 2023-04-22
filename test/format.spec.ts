import { describe, expect, it } from "@jest/globals";
import { compositor, dataSizeIEC, dataSizeSI, durationFmt, ellipsis } from "../src/format.js";

describe("formatDiv", () => {
	const invalid = [
		Infinity,
		NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	];

	it.each(invalid)("should throws on invalid input %#", (input) => {
		expect(() => dataSizeIEC.formatDiv(input)).toThrow(TypeError(`${input} is not a finite number`));
	});

	const cases: Array<[number, string]> = [
		[0, "0 B"],
		[0.7, "0.7 B"],
		[10.1, "10.1 B"],
		[1023, "1023 B"],
		[1025, "1 KB"],
		[1.2089258196146292e+24, "1 YB"],
		[1.2089258196146292e+25, "10 YB"],

		[-0, "0 B"],
		[-0.7, "-0.7 B"],
		[-10.1, "-10.1 B"],
		[-1023, "-1023 B"],
		[-1025, "-1 KB"],
	];
	it.each(cases)("should format bytes %s", (number, string) => {
		expect(dataSizeIEC.formatDiv(number)).toBe(string);
	});

	it.each([
		[1e30, "1000000 YB"],
	])("should format bytes %s in SI", (number, string) => {
		expect(dataSizeSI.formatDiv(number)).toBe(string);
	});

	it("should support specific unit of the value", () => {
		expect(dataSizeSI.formatDiv(10000, "YB")).toBe("10000 YB");
		expect(dataSizeSI.formatDiv(512e4, "MB")).toBe("5.12 TB");
	});
});

describe("formatMod", () => {
	it.each([
		undefined,
		NaN,
		Infinity,
		Number.NEGATIVE_INFINITY,
		"11",
	])("should throw with invalid value %s", value => {
		// @ts-expect-error
		expect(() => durationFmt.formatMod(value, "s")).toThrow(new Error(`${value} is not a finite number`));
	});

	it("should throw with invalid unit", () => {
		// @ts-expect-error
		expect(() => durationFmt.formatMod(11, "foobar")).toThrow(new Error("Unknown time unit: foobar"));
	});

	const cases: Array<[number, any, string]> = [
		[60, "s", "1m"],
		[1234, "s", "20m 34s"],
		[97215, "s", "1d 3h"],
		[22, "ns", "22ns"],
		[10000, "d", "10000d"],

		[0.1, "ns", "0ns"], // Modulo format ignore value smaller than one minimum unit.
		[0, "ns", "0ns"],
		[1, "ns", "1ns"],
		[0, "h", "0h"],
		[0.5, "h", "30m"],

		[-97215, "s", "-1d 3h"],
		[0, "s", "0s"],
		[-0, "s", "0s"],
	];
	it.each(cases)("should works %#", (number, unit, expected) => {
		expect(durationFmt.formatMod(number, unit)).toBe(expected);
	});

	it("should support custom part count", () => {
		expect(durationFmt.formatMod(97215, "s", 4)).toBe("1d 3h 0m 15s");
		expect(durationFmt.formatMod(0.522, "h", 99)).toBe("31m 19s 200ms");
	});
});

describe("UnitConvertor.parse", () => {
	const invalid = [
		"",
		"foobar",
		" 1023 B",
		// "1023 B ",
	];
	it.each(invalid)("should throws on invalid input %#", input => {
		expect(() => dataSizeSI.parse(input)).toThrow(new Error(`Can not convert "${input}" to data size`));
	});

	it("should throw on unknown unit", () => {
		expect(() => dataSizeIEC.parse("1023 SB")).toThrow(new Error("Unknown data size unit: SB"));
	});

	it("should throw error with invalid target unit", () => {
		// @ts-expect-error
		expect(() => durationFmt.parse("11s", "foobar")).toThrow(new Error("Unknown time unit: foobar"));
	});

	it.each([
		"1d after the 3h",
		"",
		"11",
		"h",
		"20m -34s",
	])("should throw with invalid value %s", value => {
		expect(() => durationFmt.parse(value, "s")).toThrow(new Error(`Can not convert "${value}" to time`));
	});

	it.each([
		"11h 22h",
		"3ms 1m",
	])("should throw error if groups in wrong order", value => {
		expect(() => durationFmt.parse(value, "s"))
			.toThrow(new Error("Units must be ordered from largest to smallest"));
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
	it.each(cases)("should parse %s", (number, string) => {
		expect(dataSizeIEC.parse(string)).toBe(number);
	});

	const unitCases: Array<[number, any, string]> = [
		[60, "s", "1m"],
		[1234, "s", "20m 34s"],
		[97215, "s", "1d 3h 0m 15s"],
		[22, "ns", "22ns"],
		[10000, "d", "10000d"],
		[0.522, "h", "31m 19s 200ms"],

		[0, "ns", "0ns"],
		[0, "h", "0h"],
		[0.5, "h", "30m"],
	];
	it.each(unitCases)("should parse with target unit for %s", (expected, unit, str) => {
		expect(durationFmt.parse(str, unit)).toBeCloseTo(expected, 5);
	});

	it("should parse the value in SI", () => {
		expect(dataSizeSI.parse("1023 MB")).toBe(1023_000_000);
	});

	it("should support specific target unit", () => {
		expect(dataSizeSI.parse("10000 YB", "YB")).toBe(10000);
		expect(dataSizeSI.parse("5.12 TB", "MB")).toBe(512e4);
	});
});

describe("ellipsis", () => {
	it("should throw error if position is invalid", () => {
		// @ts-expect-error
		expect(() => ellipsis("0123456789", 2, "foobar"))
			.toThrow(new TypeError("Invalid position: foobar. supported (start|mid|end)"));
	});

	it("should trim whitespaces", () => {
		expect(ellipsis(" 0123 4\t\t", 5)).toBe("01… 4");
	});

	it.each([
		["0123456789", 10, "begin", "0123456789"],

		["0123456789", 8964, "begin", "0123456789"],
		["0123456789", 3, "begin", "…89"],
		["0123456789", 4, "begin", "…789"],

		["0123456789", 8964, "mid", "0123456789"],
		["0123456789", 3, "mid", "0…9"],
		["0123456789", 4, "mid", "01…9"],
		["0123456789", 5, "mid", "01…89"],

		["0123456789", 8964, "end", "0123456789"],
		["0123456789", 3, "end", "01…"],
		["0123456789", 4, "end", "012…"],
	])("should works", (value, length, position, expected) => {
		expect(ellipsis(value, length, position as any)).toBe(expected);
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
