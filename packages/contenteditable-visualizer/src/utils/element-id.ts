/**
 * Element ID management for tracking DOM elements
 * Uses WeakMap to store IDs in memory only (not in DOM)
 * This keeps the tracking invisible to users and doesn't modify the DOM
 */

let _elementIdCounter = 0;
const ID_PREFIX = 'cev-';
const _elementIdMap = new WeakMap<Element, string>();

/**
 * Gets or creates a tracking ID for an element
 * Uses WeakMap to store IDs in memory only (not visible in DOM)
 * 
 * @param element - The element to get/create ID for
 * @returns Unique ID string
 */
export function getElementId(element: Element): string {
  // Check if element already has a tracking ID in WeakMap
  const existingId = _elementIdMap.get(element);
  if (existingId) {
    return existingId;
  }
  
  // Otherwise, assign a new unique ID and store in WeakMap
  const newId = `${ID_PREFIX}${++_elementIdCounter}_${Date.now()}`;
  _elementIdMap.set(element, newId);
  return newId;
}

/**
 * Ensures all elements in a subtree have tracking IDs
 * Useful for initializing the contenteditable area
 * IDs are stored in memory only (WeakMap), not in DOM
 * 
 * @param root - Root element to process
 * @param maxDepth - Maximum depth to traverse (default: 20)
 */
export function ensureSubtreeIds(root: Element, maxDepth: number = 20): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: () => NodeFilter.FILTER_ACCEPT
    }
  );
  
  let depth = 0;
  let node = walker.nextNode();
  
  while (node && depth < maxDepth) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      getElementId(node as Element);
    }
    node = walker.nextNode();
    depth++;
  }
}

