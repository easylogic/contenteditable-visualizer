/**
 * Text node unique identifier management using WeakMap for memory safety
 */
let _textNodeIdCounter = 0;
const _textNodeIdMap = new WeakMap<Text, string>();

/**
 * Gets or creates a unique ID for a text node
 * Uses WeakMap so there's no memory leak - IDs are automatically cleaned up
 *
 * @param textNode - The Text node
 * @returns Unique ID string
 */
export function getTextNodeId(textNode: Text): string {
  let id = _textNodeIdMap.get(textNode);
  if (!id) {
    id = `text_${++_textNodeIdCounter}_${Date.now()}`;
    _textNodeIdMap.set(textNode, id);
  }
  return id;
}

/**
 * Text node information
 */
export type TextNodeInfo = {
  /** Unique ID of the text node */
  id: string;
  /** The Text node itself */
  textNode: Text;
  /** Parent element */
  parentElement: Element;
  /** Parent signature for tracking (tagName[nth].className) */
  parentSignature: string;
  /** Text content */
  text: string;
  /** Offset within parent element */
  offset: number;
};

/**
 * Creates a snapshot of all text nodes in the element
 * Used to detect DOM changes between beforeinput and input events
 * 
 * @param element - The editable root element
 * @returns Map of text node IDs to TextNodeInfo
 */
export function snapshotTextNodes(element: HTMLElement): Map<string, TextNodeInfo> {
  const infoMap = new Map<string, TextNodeInfo>();
  
  try {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const id = getTextNodeId(textNode);
        const parentElement = textNode.parentElement;
        
        if (parentElement) {
          // Calculate offset within parent element
          let offset = 0;
          let sibling = textNode.previousSibling;
          while (sibling) {
            if (sibling.nodeType === Node.TEXT_NODE) {
              offset += (sibling as Text).length;
            }
            sibling = sibling.previousSibling;
          }
          
          // Generate parent element signature
          const tagName = parentElement.tagName.toLowerCase();
          const directParent = parentElement.parentElement;
          let nthChild = 0;
          if (directParent) {
            const siblings = Array.from(directParent.children).filter(
              el => el.tagName === parentElement.tagName,
            );
            nthChild = siblings.indexOf(parentElement);
          }
          const className = parentElement.className || "";
          const parentSignature = `${tagName}[${nthChild}].${className}`;
          
          infoMap.set(id, {
            id,
            textNode,
            parentElement,
            parentSignature,
            text: textNode.data,
            offset,
          });
        }
      }
      node = walker.nextNode();
    }
  } catch (error) {
    console.warn("Failed to snapshot text nodes:", error);
  }
  
  return infoMap;
}

