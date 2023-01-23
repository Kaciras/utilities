import { parseDuration } from "../dist/node.js";

function run(name, func) {

	function iter() {
		for (let i = 0; i < 1000_000; i++) func();
	}

	iter(); // warm up

	const start = performance.now();
	iter();
	const dur = performance.now() - start;

	console.log("\n" + name);
	console.log(`${dur.toFixed(3)} ns/op`);
}

function buildMultiplierTable(units) {
	const table = Object.create(null);
	const { length } = units;

	for (let i = 0; i < length; i += 2) {
		const row = table[units[i]] = new Array(length);
		row[i] = 1;
		for (let j = i - 2, v = 1; j >= 0; j -= 2) {
			row[j] = (v /= units[j + 1]);
		}
		for (let j = i + 2, v = 1; j < length; j += 2) {
			row[j] = (v *= units[j - 1]);
		}
	}
	return table;
}

const groupRE = /\d+([a-z]+)\s*/gi;

function s2nModulo(table, units, value, unit) {
	const row = table[unit];
	if (!row) {
		throw new Error(`Unknown unit: ${unit}`);
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
				: `Unknown unit: ${u}`);
		}

		seen += matched.length;
		result += parseFloat(matched) * row[j];
	}

	if (seen === value.length && seen > 0) {
		return result;
	}
	throw new Error(`Can not parse: "${value}"`);
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

const t = buildMultiplierTable(TIME_UNITS);

function parseWithTable(a, b) {
	s2nModulo(t, TIME_UNITS, a, b);
}

run("Prebuild Table", () => parseWithTable("3d 1h 20m", "ns"));
run("Iterable", () => parseDuration("3d 1h 20m", "ns"));
