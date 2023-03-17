import { readFileSync } from "fs";
import { PassThrough, Readable } from "stream";
import { Composite, compositor } from "../lib/node.js";

const ITERATIONS = 10_000;

async function run(name, func) {
	for (let i = 0; i < ITERATIONS; i++) await func(); // warm up

	const start = performance.now();
	for (let i = 0; i < ITERATIONS; i++) await func();
	const dur = (performance.now() - start) / 10;

	console.log(`${name}\t${dur.toFixed(3)} ns/op`);
}

Composite.prototype.toStream = function () {
	return Readable.from(this.parts);
};

const newComposite = compositor(readFileSync("index.html", "utf8"), {
	metadata: "<!--ssr-metadata-->",
	headTags: "<!--seo-head-tags-->",
	title: /(?<=<title>).*(?=<\/title>)/s,
	preloads: /(?=<\/head>)/s,
	bodyAttrs: /(?<=<body.*?)(?=>)/s,
	appHtml: /(?<=<body.*?>).*(?=<\/body>)/s,
});

async function readAll(stream) {
	for await (const _ of stream);
}

await run("toString", () => {
	const r = new PassThrough();
	r.push(newComposite().toString());
	r.end();
	return readAll(r);
});

await run("Multi push", () => {
	const r = new PassThrough();
	const { parts } = newComposite();
	for (const p of parts) {
		r.push(p);
	}
	r.end();
	return readAll(r);
});

await run("toStream", () => {
	const r = new PassThrough();
	newComposite().toStream().pipe(r);
	return readAll(r);
});
