import { defineSuite } from "esbench";
import LRUCache from "../src/LRUCache.ts";

export default defineSuite({
	params: {
		method: ["get", "set", "delete", "eliminate"],
	},
	timing: {
		throughput: "s",
	},
	setup(scene) {
		const cache = new LRUCache({ capacity: 1000 });

		if (scene.params.method === "get") {
			for (let i = 0; i < 1000; i++) cache.set(i, i);

			scene.bench("run", () => {
				for (let i = 0; i < 1000; i++) cache.get(i);
			});
		} else if (scene.params.method === "set") {
			scene.beforeIteration(() => cache.clear());

			scene.bench("run", () => {
				for (let i = 0; i < 1000; i++) cache.set(i, i);
			});
		} else if (scene.params.method === "delete") {
			scene.beforeIteration(() =>{
				for (let i = 0; i < 1000; i++) cache.set(i, i);
			});

			scene.bench("run", () => {
				for (let i = 0; i < 1000; i++) cache.delete(i);
			});
		} else {
			scene.beforeIteration(() => {
				cache.clear();
				for (let i = 0; i < 1000; i++) cache.set(i, i);
			});

			scene.bench("run", () => {
				for (let i = 1000; i < 2000; i++) cache.set(i, i);
			});
		}
	},
});
