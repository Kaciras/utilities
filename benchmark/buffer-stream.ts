import { defineSuite } from "esbench";

const buffer = Buffer.alloc(50 * 1024 * 1024);

/*
 * | No. |           Name |     time |   time.SD | time.ratio |
 * | --: | -------------: | -------: | --------: | ---------: |
 * |   0 |       Response | 23.94 ms | 242.17 us |    +49.13% |
 * |   1 |           Blob | 24.04 ms |  76.37 us |    +49.75% |
 * |   2 | ReadableStream | 16.05 ms |  91.15 us |      0.00% |
 */
export default defineSuite({
	validate: {
		check: v => v.length === buffer.length,
	},
	baseline: {
		type: "Name",
		value: "ReadableStream",
	},
	setup(scene) {
		scene.benchAsync("Response", () => {
			return new Response(buffer).arrayBuffer();
		});
		scene.benchAsync("Blob", () => {
			return new Blob([buffer]).arrayBuffer();
		});
		scene.benchAsync("ReadableStream", () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(buffer);
					controller.close();
				},
			});
			return new Response(stream).arrayBuffer();
		});
	},
});
