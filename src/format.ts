type EllipsisPos = "begin" | "mid" | "end";

/**
 * Truncates a string, insert or append an ellipsis at any desired position
 * of the truncated result.
 *
 * # Alternatives
 * [smart-truncate](https://github.com/millerized/smart-truncate)
 *
 * @param value The long string to truncate.
 * @param length The length of the truncated result, must greater than 1.
 * @param position The position of the ellipsis mark inserted to.
 */
export function ellipsis(value: string, length: number, position: EllipsisPos = "mid") {
	value = value.trim();

	if (value.length <= length) {
		return value;
	}
	let n = length - 1;

	switch (position) {
		case "end":
			return value.slice(0, n) + "…";
		case "begin":
			return "…" + value.slice(-n);
		case "mid":
			n = Math.ceil(n / 2);
			return `${value.slice(0, n)}…${value.slice(-length + n + 1)}`;
	}
}

/**
 * Search numbers from the text and insert thousands separators to them.
 *
 * This function uses Lookbehind, which may not be supported by older browsers..
 * https://caniuse.com/js-regexp-lookbehind
 *
 * @example
 * separateThousand("ID: 5678, Price: 1234$");		// "ID: 5,678, Price: 1,234$"
 * separateThousand("var n = 1000000.2345", "_");	// "var n = 1_000_000.2345"
 *
 * @link https://stackoverflow.com/a/2901298
 */
export function separateThousand(text: string, separator = ",") {
	return text.replaceAll(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Split command line string into arguments list and remove the quotes.
 * This function does not work with invalid quotes, such as `a"""b`.
 *
 * @example
 * splitCLI("node"); 				// ["node"]
 * splitCLI("node --foo");			// ["node", "--foo"]
 * splitCLI("");					// []
 *
 * splitCLI('"node --foo"');		// ["node --foo"]
 * splitCLI('"node" "--foo"');		// ["node", "--foo"]
 * splitCLI('node\\" \\"--foo');	// ['node"', '"--foo']
 * splitCLI('"node\\" \\"--foo"');	// ['node" "--foo']
 */
export function splitCLI(command: string) {
	const matches = command.matchAll(/"(.+?)(?<!\\)"|(\S+)/g);
	return Array.from(matches, ([, a, b]) => (a ?? b).replaceAll('\\"', '"'));
}

/**
 * Combine command line arguments into a string, with necessary quotes and special chars escaped.
 *
 * # Alternatives
 * You can wrap each argument with quote: `args.map(JSON.stringify).join(" ")`,
 * which is equivalent with this function for start processes, but more verbose.
 *
 * @example
 * buildCLI("node", "--foo");		// 'node --foo'
 * buildCLI("node", '--"foo"');		// 'node --\\"foo\\"'
 * buildCLI("node --foo");			// '"node --foo"'
 * buildCLI("node", "--foo=1 | 2");	// 'node "--foo=1 | 2"'
 * buildCLI();						// ''
 * buildCLI("");					// ''
 */
export function buildCLI(...args: string[]) {
	return args.map(escapeCLIArg).join(" ");
}

function escapeCLIArg(argument: string) {
	argument = argument.replaceAll('"', '\\"');
	return /[\s|]/.test(argument) ? `"${argument}"` : argument;
}

type Placeholders = Record<string, string | RegExp>;

/**
 * A simple string template engine, only support replace placeholders.
 *
 * It 10x faster than String.replaceAll() by splits the string ahead of time.
 *
 * # Alternatives
 * [mustache.js](https://github.com/janl/mustache.js)
 *
 * @example
 * const template = "<html><head></head><body></body></html>";
 * const newComposite = compositor(template, {
 * 		bodyAttrs: /(?<=<body.*?)(?=>)/s,
 * 		appHtml: /(?<=<body.*?>).*(?=<\/body>)/s,
 * });
 *
 * const c = newComposite();
 * c.put("appHtml", "<div id='app'>...</div>");
 * c.put("bodyAttrs", " class='ssr dark'");
 * return composite.toString();
 *
 * @param template The template string
 * @param placeholders An object contains placeholders with its name as key.
 */
export function compositor<T extends Placeholders>(
	template: string,
	placeholders: T,
) {
	const nameToSlot = new Map<keyof T, number>();
	const positions = [];

	for (const name of Object.keys(placeholders)) {
		const pattern = placeholders[name];
		let startPos: number;
		let endPos: number;

		if (typeof pattern === "string") {
			startPos = template.indexOf(pattern);
			if (startPos === -1) {
				throw new Error("No match for: " + pattern);
			}
			endPos = startPos + pattern.length;
		} else {
			const match = pattern.exec(template);
			if (!match) {
				throw new Error("No match for: " + pattern);
			}
			startPos = match.index;
			endPos = startPos + match[0].length;
		}

		positions.push({ name, startPos, endPos });
	}

	// Sort by start position so we can check for overlap.
	positions.sort((a, b) => a.startPos - b.startPos);

	let lastEnd = 0;
	const parts: string[] = [];

	for (let i = 0; i < positions.length; i++) {
		const { name, startPos, endPos } = positions[i];
		nameToSlot.set(name, i * 2 + 1);

		if (startPos < lastEnd) {
			throw new Error("Placeholder overlapped.");
		}

		parts.push(template.slice(lastEnd, startPos));
		parts.push(template.slice(startPos, lastEnd = endPos));
	}

	parts.push(template.slice(lastEnd));

	return () => new Composite<T>(nameToSlot, [...parts]);
}

export class Composite<T extends Placeholders> {

	private readonly nameToSlot: Map<keyof T, number>;
	private readonly parts: string[];

	constructor(nameToSlot: Map<keyof T, number>, parts: string[]) {
		this.parts = parts;
		this.nameToSlot = nameToSlot;
	}

	toString() {
		return this.parts.join("");
	}

	put(name: keyof T, value: string) {
		this.parts[this.nameToSlot.get(name)!] = value;
	}
}
