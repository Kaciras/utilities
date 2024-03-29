import { describe, expect, it } from "@jest/globals";
import { dataSizeIEC, dataSizeSI, decimalPrefix, durationFmt } from "../src/unit.ts";

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
		[1025, "1 KiB"],
		[1.2089258196146292e+24, "1 YiB"],
		[1.2089258196146292e+25, "10 YiB"],

		[-0, "0 B"],
		[-0.7, "-0.7 B"],
		[-10.1, "-10.1 B"],
		[-1023, "-1023 B"],
		[-1025, "-1 KiB"],
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

	it("should append decimal prefix immediately after the number", () => {
		expect(decimalPrefix.formatDiv(123456789)).toBe("123.46M");
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

	it.each([
		[decimalPrefix, "Unknown decimal prefix unit: SiB"],
		[dataSizeSI, "Unknown data size unit: SiB"],
		[dataSizeIEC, "Unknown data size unit: SiB"],
		[durationFmt, "Unknown time unit: SiB"],
	])("should throw on unknown unit", (convertor, message) => {
		expect(() => convertor.parse("1023 SiB")).toThrow(new Error(message));
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
		[1024, "1 KiB"],
		[1.2089258196146292e+24, "1 YiB"],

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

describe("UnitConvertor.getFraction", () => {
	it.each([
		["TB", undefined, 1e12],
		[undefined, "KB", 1e-3],
		["TB", "MB", 1e6],
		["MB", "TB", 1e-6],
	])("should works %#", (unit, base, expected) => {
		expect(dataSizeSI.getFraction(unit, base)).toBe(expected);
	});

	it("should throw error with invalid unit", () => {
		expect(() => dataSizeSI.getFraction("B", "foobar")).toThrow();
	});
});

describe("UnitConvertor.homogeneous", () => {
	it("should works", () => {
		const fuf = dataSizeSI.homogeneous([1200, 1e13]);
		expect(fuf.sep).toBe(" ");
		expect(fuf.unit).toBe("KB");
		expect(fuf.scale).toBe(1e-3);
		expect(fuf.format(0)).toBe("0.00 KB");
		expect(fuf.format(1200)).toBe("1.20 KB");
	});

	it.each([
		[[8964, 0], undefined, "1.20 KB"],
		[[undefined, 8964], undefined, "1.20 KB"],
		[[], undefined, "1200.00 B"],
		[[1500, 1e13], "MB", "1.20 GB"],
		[[-1500, 1e13], "MB", "1.20 GB"],
	])("should works %#", (values, iu, expected) => {
		const fmt = dataSizeSI.homogeneous(values, iu as any);
		expect(fmt.format(1200)).toBe(expected);
		expect(fmt.format(-1200)).toBe("-" + expected);
	});

	it("should support specific precision", () => {
		const { format } = dataSizeSI.homogeneous([1200, 1e13], "MB");
		expect(format(1200, 0)).toBe("1 GB");
		expect(format(1200, 3)).toBe("1.200 GB");
	});
});
