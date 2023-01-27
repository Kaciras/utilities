import { describe, expect, it } from "@jest/globals";
import { compositor, dataSizeIEC, dataSizeSI, durationConvertor } from "../lib/format.js";

describe("n2sDivision", () => {
	const invalid = [
		Infinity,
		NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	];

	it.each(invalid)("should throws on invalid input %#", (input) => {
		expect(() => dataSizeIEC.n2sDivision(input)).toThrow(TypeError(`${input} is not a finite number`));
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
		expect(dataSizeIEC.n2sDivision(number)).toBe(string);
	});

	it.each([
		[1e30, "1000000 YB"],
	])("should format bytes %s in SI", (number, string) => {
		expect(dataSizeSI.n2sDivision(number)).toBe(string);
	});
});

describe("parseSize", () => {
	const invalid = [
		"",
		"foobar",
		" 1023 B",
		"1023 B ",
	];
	it.each(invalid)("should throws on invalid input %#", input => {
		expect(() => dataSizeIEC.s2nDivision(input)).toThrow(new Error(`Can not convert "${input}" to data size`));
	});

	it("should throw on unknown unit", () => {
		expect(() => dataSizeIEC.s2nDivision("1023 SB")).toThrow(new Error("Unknown data size unit: SB"));
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
		expect(dataSizeIEC.s2nDivision(string)).toBe(number);
	});

	it("should parse the value in SI", () => {
		expect(dataSizeSI.s2nDivision("1023 MB")).toBe(1023_000_000);
	});
});

describe("formatDuration", () => {

	it("should throw with invalid unit", () => {
		// @ts-expect-error
		expect(() => durationConvertor.n2sModulo(11, "foobar")).toThrow(new Error("Unknown time unit: foobar"));
	});

	it.each([
		undefined,
		NaN,
		Infinity,
		Number.NEGATIVE_INFINITY,
		"11",
	])("should throw with invalid value %s", value => {
		// @ts-expect-error
		expect(() => durationConvertor.n2sModulo(value, "s")).toThrow(new Error(`${value} is not a finite number`));
	});

	it("should throw with negative value", () => {
		expect(() => durationConvertor.n2sModulo(-11, "s")).toThrow("value (-11) can not be negative");
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
		expect(durationConvertor.n2sModulo(number, unit)).toBe(expected);
	});

	it("should support custom part count", () => {
		expect(durationConvertor.n2sModulo(97215, "s", 4)).toBe("1d 3h 0m 15s");
		expect(durationConvertor.n2sModulo(0.522, "h", 99)).toBe("31m 19s 200ms");
	});
});

describe("parseDuration", () => {
	it("should throw with invalid unit", () => {
		// @ts-expect-error
		expect(() => durationConvertor.s2nModulo("11s", "foobar")).toThrow(new Error("Unknown time unit: foobar"));
	});

	it.each([
		undefined,
		"",
		"11",
		"h",
		"-11h",
		"1d after the 3h",
		"11W",
	])("should throw with invalid value %s", value => {
		// @ts-expect-error
		expect(() => durationConvertor.s2nModulo(value, "s")).toThrow();
	});

	it.each([
		"11h 22h",
		"3ms 1m",
	])("should throw error if groups in wrong order", value => {
		expect(() => durationConvertor.s2nModulo(value, "s")).toThrow("Units must be ordered from largest to smallest");
	});

	const cases: Array<[number, any, string]> = [
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
	it.each(cases)("should works %#", (expected, unit, str) => {
		expect(durationConvertor.s2nModulo(str, unit)).toBeCloseTo(expected, 5);
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
