/**
 * Swap the positions of nodeA and nodeB in the DOM.
 *
 * @see https://stackoverflow.com/a/10717422/7065321
 */
export function swapElements(nodeA: Element, nodeB: Element) {
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
function indexInParent(el: Node, from?: number) {
	return Array.prototype.indexOf.call(el.parentNode!.children, el, from);
}

/**
 * Add reorderable support for elements using drag-and-drop. Elements must be
 * children of same parent node.
 *
 * TODO: sort items between different parent.
 *
 * This function creates a "Drag context" and return a register function.
 * Elements registered in the same context can drag to swap with each other.
 *
 * You need add draggable="true" to the element if it is not default draggable.
 *
 * # Alternatives
 * [Sortable](https://github.com/SortableJS/Sortable)
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
			const i = indexInParent(currentTarget);
			const j = indexInParent(dragging, i);
			if (j === -1) {
				currentTarget.after(dragging);
			} else {
				currentTarget.before(dragging);
			}
		}
	}

	return (element: GlobalEventHandlers) => {
		element.addEventListener("dragstart", dragstart);
		element.addEventListener("dragend", dragend);
		element.addEventListener("dragenter", dragenter);
	};
}
