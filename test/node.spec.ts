import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as browser from "../src/node.ts";
import { importCWD, noop, onExit } from "../src/node.ts";

it("should export sub modules", () => {
	expect("isPointerInside" in browser).toBe(false);
	expect("saveFile" in browser).toBe(false);

	expect(typeof browser.onExit).toBe("function");
});

// TODO: we need integration tests with real signals.
describe("onExit", () => {
	const mockExit = jest.spyOn(process, "exit");
	const listener = jest.fn();
	let removeListener: () => void;

	beforeEach(() => {
		removeListener = onExit(listener);
	});

	afterEach(() => {
		removeListener();
		process.exitCode = undefined;
	});

	it("should call listeners", () => {
		process.emit("SIGQUIT");
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("should remote listeners", () => {
		removeListener();
		process.emit("SIGBREAK");
		expect(listener).not.toHaveBeenCalled();
	});

	it("should force exit on double", () => {
		mockExit.mockImplementationOnce(noop as any);
		process.emit("SIGBREAK");
		process.emit("SIGBREAK");

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("should use exitCode on force exiting", () => {
		mockExit.mockImplementationOnce(noop as any);
		process.exitCode = 8964;

		process.emit("SIGBREAK");
		process.emit("SIGBREAK");

		expect(mockExit).toHaveBeenCalledWith(8964);
	});
});

describe("importCWD", () => {
	it("should do nothing if arguments are undefined", () => {
		return expect(importCWD(undefined, undefined)).resolves.toBeUndefined();
	});
	it("should import modules from CWD", () => {
		return expect(importCWD("jest.config.js")).resolves.toHaveProperty("testMatch");
	});
	it("should throw if module not found", () => {
		return expect(importCWD("NON-EXISTS.js")).rejects.toThrow();
	});
	it("should use module in favor of default", () => {
		return expect(importCWD("jest.config.js", "eslint.config.js"))
			.resolves.toHaveProperty("testMatch");
	});
	it("should fallback to default", () => {
		return expect(importCWD(undefined, "jest.config.js"))
			.resolves.toHaveProperty("testMatch");
	});
	it("should not use default if the module is specified", () => {
		return expect(importCWD("NON-EXISTS.js", "jest.config.js")).rejects.toThrow();
	});
	it("should not require the default module exists", () => {
		return expect(importCWD(undefined, "NON-EXISTS.js")).resolves.toBeUndefined();
	});
	it("should ignore the module parameter if it equals to default", () => {
		return expect(importCWD("NON-EXISTS.js", "NON-EXISTS.js")).resolves.toBeUndefined();
	});
});
