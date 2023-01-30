import { dataSizeIEC, durationConvertor } from "../dist/node.js";

function n2sDivision(units, value, uIndex) {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${value} is not a finite number`);
	}
	let v = Math.abs(value);

	for (; uIndex < units.length; uIndex += 2) {
		if (v < units[uIndex + 1])
			break;
		v /= units[uIndex + 1];
	}

	if (value < 0) v = -v;
	return `${Number(v.toFixed(2))} ${units[uIndex]}`;
}

const divRE = /^([-+0-9.]+)\s*(\w+)$/;

function s2nDivision(name, units, value) {
	const match = divRE.exec(value);
	if (!match) {
		throw new Error(`Can not convert "${value}" to ${name}`);
	}
	const [, v, unit] = match;
	let result = Number(v);

	for (let i = 0; i < units.length; i += 2) {
		if (units[i] === unit) {
			return result;
		} else {
			result *= units[i + 1];
		}
	}
	throw new Error(`Unknown ${name} unit: ${unit}`);
}

function n2sModulo(name, units, value, unit, parts = 2) {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${value} is not a finite number`);
	}
	if (value < 0) {
		throw new Error(`value (${value}) can not be negative`);
	}
	let i = units.indexOf(unit);
	let d = 1;
	if (i === -1) {
		throw new Error(`Unknown ${name} unit: ${unit}`);
	}

	for (; ; i += 2) {
		const x = d * units[i + 1];
		if (value < x)
			break;
		else
			d = x;
	}

	const groups = [];
	for (;
		i >= 0 && parts > 0 && value > 1.16e-14;
		i -= 2, parts -= 1
	) {
		const t = Math.floor(value / d);
		if (groups.length || t !== 0) {
			groups.push(`${t}${units[i]}`);
		}
		value %= d;
		d /= units[i - 1];
	}
	return groups.length ? groups.join(" ") : `0${unit}`;
}

const groupRE = /\d+([a-z]+)\s*/gi;

function s2nModulo(name, units, value, unit) {
	const i = units.indexOf(unit);
	if (i === -1) {
		throw new Error(`Unknown ${name} unit: ${unit}`);
	}
	let k = units.length - 1;
	let seen = 0;
	let result = 0;

	for (const [matched, u] of value.matchAll(groupRE)) {
		const j = units.lastIndexOf(u, k);
		k = j - 2;
		if (j === -1) {
			throw new Error(units.includes(u)
				? "Units must be ordered from largest to smallest"
				: `Unknown ${name} unit: ${u}`);
		}
		let n = parseFloat(matched);
		if (j > i) {
			for (let k = i; k < j; k += 2) {
				n *= units[k + 1];
			}
		} else {
			for (let k = j; k < i; k += 2) {
				n /= units[k + 1];
			}
		}
		result += n;
		seen += matched.length;
	}
	if (seen === value.length && seen > 0) {
		return result;
	}
	throw new Error(`Can not convert "${value}" to ${name}`);
}

const TIME_UNITS = [
	"ns", 1000,
	"us", 1000,
	"ms", 1000,
	"s", 60,
	"m", 60,
	"h", 24,
	"d", Infinity,
];

export function formatDuration(value, unit, parts = 2) {
	return n2sModulo("time", TIME_UNITS, value, unit, parts);
}

export function parseDuration(value, unit) {
	return s2nModulo("time", TIME_UNITS, value, unit);
}

const SIZE_UNITS_SI = [
	"B", 1000,
	"KB", 1000,
	"MB", 1000,
	"GB", 1000,
	"TB", 1000,
	"PB", 1000,
	"EB", 1000,
	"ZB", 1000,
	"YB", Infinity,
];
const SIZE_UNITS_IEC = [
	"B", 1024,
	"KB", 1024,
	"MB", 1024,
	"GB", 1024,
	"TB", 1024,
	"PB", 1024,
	"EB", 1024,
	"ZB", 1024,
	"YB", Infinity,
];

export function formatSize(value, fraction = 1024) {
	return `${n2sDivision(fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI, value, 0)}`;
}

export function parseSize(value, fraction = 1024) {
	return s2nDivision("data size", fraction === 1024 ? SIZE_UNITS_IEC : SIZE_UNITS_SI, value);
}

// ======================================================================================

const ITERATIONS = 10_000_000;

function run(name, func) {
	for (let i = 0; i < ITERATIONS; i++) func(); // warm up

	const start = performance.now();
	for (let i = 0; i < ITERATIONS; i++) func();
	const dur = (performance.now() - start) / 10;

	console.log(`${name}\t${dur.toFixed(3)} ns/op`);
}

console.log("\n[formatSize]");
run("Legacy:\t", () => formatSize(15_234_892));
run("New Impl:", () => dataSizeIEC.n2sDivision(15_234_892));

console.log("\n[parseSize]");
run("Legacy:\t", () => parseSize("14.5 MB"));
run("New Impl:", () => dataSizeIEC.s2nDivision("14.5 MB"));

console.log("\n[formatDuration]");
run("Legacy:\t", () => formatDuration(97215, "s"));
run("New Impl:", () => durationConvertor.n2sModulo(97215, "s"));

console.log("\n[parseDuration]");
run("Legacy:\t", () => parseDuration("3d 1h 20m", "ns"));
run("New Impl:", () => durationConvertor.s2nModulo("3d 1h 20m", "ns"));
