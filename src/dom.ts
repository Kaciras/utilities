/**
 * Detect if the pointer is inside the element.
 *
 * @example
 * const dialog = document.querySelector("dialog");
 * dialog.showModal();
 * dialog.onclick = e => {
 *     if (!isPointerInside(e)) dialog.close();
 * };
 *
 * @param event You can only get pointer position in event handler.
 * @param el The element to check. if not present, use event.currentTarget.
 * @see https://stackoverflow.com/q/2601097/7065321
 */
export function isPointerInside(event: MouseEvent, el?: Element) {
	el ??= event.currentTarget as Element;

	const { clientX, clientY } = event;
	const rect = el.getBoundingClientRect();

	return clientY > rect.top && clientY < rect.bottom &&
		clientX > rect.left && clientX < rect.right;
}

/**
 * Swap locations of `nodeA` and `nodeB` in the DOM.
 *
 * @see https://stackoverflow.com/a/10717422/7065321
 */
export function swapElements(nodeA: Element, nodeB: Element) {
	// You can not move `document` element :)
	const parentB = nodeB.parentNode!;
	const nextB = nodeB.nextSibling;

	// A is the next sibling of B, just insert it before.
	if (nextB === nodeA) {
		return nodeB.before(nodeA);
	}

	nodeA.before(nodeB);

	if (nextB) {
		// Insert A into the original position of B.
		nextB.before(nodeA);
	} else {
		// B was the last child, append A to the end.
		parentB.append(nodeA);
	}
}

/**
 * Gets the element's index among all children of its parent.
 * Throw an error if the element does not have a parent.
 *
 * @param el The DOM element.
 * @param from The array index at which to begin the search, default 0.
 * @return The first index of the element in the array; -1 if not found.
 */
export function nthInChildren(el: Node, from?: number) {
	return Array.prototype.indexOf.call(el.parentNode!.children, el, from);
}

/**
 * Reorder elements using drag-and-drop. Elements must be children of same parent.
 *
 * This function creates a "Drag context". Elements registered in the
 * same context can drag to swap with each other.
 *
 * You need add draggable="true" to the element if it is not default draggable.
 *
 * # Sort cross different parent?
 * It's hard to decision insert before or after to target element. One solution is to
 * calculate the pointer is in the first half or the second half of the target,
 * but this is hard to implement and cannot handle the new added CSS property.
 *
 * https://github.com/SortableJS/Sortable/blob/7af63fdc5d7512e7f0b8abb10970d473521b31a5/src/Sortable.js#L161
 *
 * # Alternatives
 * [Sortable](https://github.com/SortableJS/Sortable)
 *
 * @example
 * const context = dragSortContext();
 * const list = document.querySelectorAll(".sort-list > a")
 * for (const link of list){
 *     context.register(link);
 * }
 *
 * @param swap true to swap items with eachother rather than sorted.
 */
export function dragSortContext(swap = false) {
	let dragging: any = null;

	function dragstart(event: DragEvent) {
		dragging = event.currentTarget;
		dragging.removeEventListener("dragenter", dragenter);
	}

	function dragend() {
		dragging.isDragging = false;
		dragging.addEventListener("dragenter", dragenter);
		dragging = null;
	}

	function dragenter({ currentTarget }: any) {
		if (!dragging) {
			return;
		}
		dragging.isDragging = true;

		if (swap) {
			swapElements(dragging, currentTarget);
		} else {
			const i = nthInChildren(currentTarget);
			const j = nthInChildren(dragging, i);
			if (j === -1) {
				currentTarget.after(dragging);
			} else {
				currentTarget.before(dragging);
			}
		}
	}

	return {
		register(element: GlobalEventHandlers) {
			element.addEventListener("dragstart", dragstart);
			element.addEventListener("dragend", dragend);
			element.addEventListener("dragenter", dragenter);
		},
		unregister(element: GlobalEventHandlers) {
			element.removeEventListener("dragstart", dragstart);
			element.removeEventListener("dragend", dragend);
			element.removeEventListener("dragenter", dragenter);
		},
	};
}
