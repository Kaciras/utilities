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
