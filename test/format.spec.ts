import { describe, expect, it } from "@jest/globals";
import { compositor, ellipsis, separateThousand, splitCLI } from "../src/format.ts";

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

describe("separateThousand", () => {
	it.each([
		["0.123456", "0.123456"],
		["100.123456", "100.123456"],
		["1000.123456", "1,000.123456"],
		["10000000.123456", "10,000,000.123456"],
		["0", "0"],
		["100", "100"],
		["1000", "1,000"],
		["10000000", "10,000,000"],
		["ee 1234 ww 5678", "ee 1,234 ww 5,678"],
	])("should works with %#", (text, expected) => {
		expect(separateThousand(text)).toBe(expected);
	});

	it("should support custom separator", () => {
		expect(separateThousand("1000", "_")).toBe("1_000");
	});
});

it.each([
	["node --foo", ["node", "--foo"]],
	["node\\ --foo", ["node\\", "--foo"]],
	['"node" "--foo"', ["node", "--foo"]],
	['"node --foo"', ["node --foo"]],
	['"node\\" \\"--foo"', ['node" "--foo']],
	["node \t--foo", ["node", "--foo"]],
	["", []],
	["node", ["node"]],
	["node ", ["node"]],
	[" node", ["node"]],
])("should split command %#", (cmd, args) => {
	expect(splitCLI(cmd)).toStrictEqual(args);
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
