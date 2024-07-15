import { readFileSync } from "node:fs";
import { defineSuite } from "esbench";
import { compositor } from "../src/node.ts";

const template = readFileSync("benchmark/index.html", "utf8");

const newComposite = compositor(template, {
	metadata: "<!--ssr-metadata-->",
	title: /(?<=<title>).*(?=<\/title>)/s,
	preloads: /(?=<\/head>)/s,
	bodyAttrs: /(?<=<body.*?)(?=>)/s,
	appHtml: /(?<=<body.*?>).*(?=<\/body>)/s,
});

export default defineSuite({
	baseline: { type: "Name", value: "replace" },
	setup(scene) {
		scene.bench("composite", () => {
			const composite = newComposite();
			composite.put("metadata", "METADATA");
			composite.put("title", "The Title");
			composite.put("preloads", "Ending of Head");
			composite.put("bodyAttrs", "");
			composite.put("appHtml", "HTML");
			return composite.toString();
		});
		scene.bench("replace", () => template
			.replace("<!--ssr-metadata-->", "METADATA")
			.replace(/(?<=<title>).*(?=<\/title>)/s, "The Title")
			.replace(/(?=<\/head>)/s, "Ending of Head")
			.replace(/(?<=<body.*?)(?=>)/s, "")
			.replace(/(?<=<body.*?>).*(?=<\/body>)/s, "HTML"));
	},
});
