import { describe, expect, it } from "@jest/globals";
import { compositor, formatDuration, formatSize, parseSize, TimeUnit } from "../lib/format.js";

describe("formatTime", () => {
	it("should format the duration", () => {
		expect(formatDuration(200, TimeUnit.Second)).toBe("3.33 m");
	});
});

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
