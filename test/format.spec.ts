import { describe, it, expect } from "@jest/globals";
import { formatSize, parseSize } from "../lib/format";

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

	const cases = [
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

	const cases = [
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
