import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as browser from "../src/node.ts";
import { noop, onExit } from "../src/node.ts";

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
