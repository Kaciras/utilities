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
		expect(() => formatSize(input)).toThrow();
	});

	const cases: Array<[number, string]> = [
		[0, "0 B"],
		[0.7, "0.7 B"],
		[10.1, "10.1 B"],
		[1023, "1023 B"],
		[1025, "1 KB"],

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
		expect(() => parseSize(input)).toThrow();
	});

	const cases: Array<[number, string]> = [
		[0, "0 B"],
		[0.7, "0.7 B"],
		[10.1, "10.1 B"],
		[1023, "1023 B"],
		[1023, "1023B"],
		[1023, "+1023B"],
		[1024, "1 KB"],

		[-0.7, "-0.7 B"],
		[-10.1, "-10.1 B"],
		[-1023, "-1023B"],
	];

	it.each(cases)("should parse bytes %s", (number, string) => {
		expect(parseSize(string)).toBe(number);
	});
});

describe("formatDuration", () => {

	const cases: Array<[number, string, string]> = [
		[1234, "s", "20m 34s"],
		[97215, "s", "1d 3h"],
		[22, "ns", "22ns"],
		[10000, "d", "10000d"],

		[0, "ns", "0ns"],
		[0, "h", "0h"],
		[0.5, "h", "30m"],
	];

	it.each(cases)("should works %#", (number,unit, expected) => {
		expect(formatDuration(number, unit)).toBe(expected);
	});

	it("should support custom part count", () => {
		expect(formatDuration(97215, "s", 4)).toBe("1d 3h 0m 15s");
		expect(formatDuration(0.522, "h", 5)).toBe("31m 19s 200ms");
	});
});

describe("compositor", () => {
	const template = "AABBCC_DD_EEFF_GG_HHII_JJKK";

	it("should throw error if placeholder not found", () => {
		expect(() => compositor(template, { foo: "bar" })).toThrow(new Error("No match for: bar"));
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
			foo: "CC_DD_EE",
			bar: /HHII/,
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
