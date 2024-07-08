/**
 * Trigger a download for the blob, the function returns immediately,
 * no way to know if the user accept or not.
 *
 * @param blob The blob object to download.
 * @param name Filename，if not specified, use blob.name.
 */
export function saveFile(blob: Blob, name?: string) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name ?? (blob as File).name;

	/*
	 * `click()` runs asynchronously, the object url was
	 * revoked before the download started, but it still works.
	 */
	try {
		a.click();
	} finally {
		URL.revokeObjectURL(a.href);
	}
}

/**
 * Open up a file picker dialog that allows the user to choose files.
 *
 * # Limitation
 * There is no way to detect the user clicked the cancel button,
 * if the user does，the returned Promise will never resolve.
 *
 * @param accept Defines the file types the file input should accept.
 * @param multiple Allows the user to select more than one file.
 * @param directory Should select directory instead of file?
 */
export function selectFile(
	accept: string,
	multiple = false,
	directory = false,
) {
	const input = document.createElement("input");
	if (directory) {
		input.webkitdirectory = true;
	}
	input.type = "file";
	input.accept = accept;
	input.multiple = multiple;
	input.click();

	return new Promise<FileList>((resolve, reject) => {
		input.onerror = reject;
		input.onchange = () => resolve(input.files!);
	});
}

type PointerMoveHandler = (e: PointerEvent, init: PointerEvent) => void;

/**
 * A helper function for implementing drag and move feature.
 *
 * @example
 * const handler = dragHandler((event, base) => {
 *     const dx = event.pageX - base.pageX;
 *     const dy = event.pageY - base.pageY;
 *     console.log(`Pointer Moved: (${dx}, ${dy})`);
 * });
 * element.addEventListener("pointerdown", handler);
 *
 * @param onMove function to be triggered on pointer move.
 * @return The "pointerdown" event listener to add to the element.
 */
export function dragHandler(onMove: PointerMoveHandler) {
	return function (initEvent: PointerEvent) {
		if (initEvent.button !== 0) {
			return;
		}
		// Avoid dragging selected contents.
		initEvent.preventDefault();

		function handleMove(event: PointerEvent) {
			onMove(event, initEvent);
		}

		/*
		 * It's better to attach handlers to `document` over `window`, as the
		 * user can use window events to ensure runs after the drag handler.
		 */
		function handleEnd(event: Event) {
			event.preventDefault();
			document.removeEventListener("pointerup", handleEnd);
			document.removeEventListener("pointermove", handleMove);
		}

		document.addEventListener("pointerup", handleEnd);
		document.addEventListener("pointermove", handleMove);
	};
}
