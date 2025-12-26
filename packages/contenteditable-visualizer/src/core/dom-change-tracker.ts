import { snapshotTextNodes, type TextNodeInfo } from './text-node-tracker';

/**
 * DOM change detection result
 */
export type DomChangeResult = {
  /** Rects of deleted text */
  deletedRects: DOMRect[];
  /** Rects of added text */
  addedRects: DOMRect[];
  /** Modified text nodes with before/after state */
  modifiedNodes: {
    before: TextNodeInfo | null;
    after: TextNodeInfo | null;
    changeType: 'deleted' | 'added' | 'modified' | 'moved';
  }[];
};

/**
 * Calculates the rects of text that will be deleted
 * Uses getTargetRanges() when available for accurate deletion area
 * 
 * @param event - InputEvent from beforeinput
 * @param _element - The editable root element (unused but kept for API consistency)
 * @returns Array of DOMRects representing areas to be deleted
 */
export function calculateDeletedRects(
  event: InputEvent,
  _element: HTMLElement
): DOMRect[] {
  const deletedRects: DOMRect[] = [];
  
  try {
    const inputType = event.inputType || "";
    const isDelete =
      inputType.startsWith("delete") ||
      inputType === "deleteContentBackward" ||
      inputType === "deleteContentForward" ||
      inputType === "deleteWordBackward" ||
      inputType === "deleteWordForward";

    const currentSelection = window.getSelection();
    const currentRange = currentSelection && currentSelection.rangeCount > 0
      ? currentSelection.getRangeAt(0)
      : null;

    const isReplace =
      !isDelete &&
      (inputType.startsWith("insert") ||
        inputType === "insertText" ||
        inputType === "insertCompositionText");

    if (!isDelete && !isReplace) {
      return deletedRects;
    }

    // Calculate rects based on the range the browser actually wants to delete using getTargetRanges()
    let rangesComputed = false;
    let targetRanges: StaticRange[] = [];
    
    try {
      targetRanges = event.getTargetRanges?.() || [];

      if (targetRanges.length > 0) {
        for (const tr of targetRanges) {
          try {
            // Convert StaticRange to Range
            const range = document.createRange();
            range.setStart(tr.startContainer, tr.startOffset);
            range.setEnd(tr.endContainer, tr.endOffset);
            
            const rects = range.getClientRects();
            for (let i = 0; i < rects.length; i++) {
              deletedRects.push(rects[i]);
            }
          } catch (e) {
            // Ignore if StaticRange conversion fails
          }
        }
        if (deletedRects.length > 0) {
          rangesComputed = true;
        }
      }
    } catch {
      // Fallback to selection-based if getTargetRanges fails
    }

    // If rects cannot be obtained with getTargetRanges(), calculate deletion area based on current selection
    if (!rangesComputed && currentRange && !currentRange.collapsed) {
      const rects = currentRange.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        deletedRects.push(rects[i]);
      }
    } else if (!rangesComputed && targetRanges.length === 0 && 
               inputType === "insertCompositionText" && currentRange) {
      // For Korean composition (insertCompositionText), consider "previous 1 character" from caret as deletion area
      if (currentRange.collapsed && currentRange.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = currentRange.startContainer as Text;
        const end = currentRange.startOffset;
        const start = Math.max(0, end - 1);
        if (end > start) {
          const tempRange = document.createRange();
          tempRange.setStart(textNode, start);
          tempRange.setEnd(textNode, end);
          const rects = tempRange.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            deletedRects.push(rects[i]);
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to compute deleted range rects:", error);
  }
  
  return deletedRects;
}

/**
 * Detects DOM changes between beforeinput and input events
 * Compares text node snapshots to find added, deleted, modified, and moved nodes
 * 
 * @param element - The editable root element
 * @param beforeInfo - Text node snapshot from beforeinput event
 * @param beforeInputDeletedRects - Deleted rects calculated in beforeinput
 * @returns DOM change detection result
 */
export function detectDomChanges(
  element: HTMLElement,
  beforeInfo: Map<string, TextNodeInfo>,
  beforeInputDeletedRects: DOMRect[]
): DomChangeResult {
  const afterInfo = snapshotTextNodes(element);
  const modifiedNodes: DomChangeResult['modifiedNodes'] = [];
  const addedRects: DOMRect[] = [];

  // Check if nodes that existed in beforeinput still exist after input
  for (const [id, beforeNode] of beforeInfo) {
    const afterNode = afterInfo.get(id);
    
    if (!afterNode) {
      // Node was deleted
      modifiedNodes.push({
        before: beforeNode,
        after: null,
        changeType: 'deleted',
      });
    } else if (beforeNode.text !== afterNode.text) {
      // Node was modified
      modifiedNodes.push({
        before: beforeNode,
        after: afterNode,
        changeType: 'modified',
      });
    } else if (beforeNode.parentSignature !== afterNode.parentSignature) {
      // Node was moved (parent changed)
      modifiedNodes.push({
        before: beforeNode,
        after: afterNode,
        changeType: 'moved',
      });
    }
  }

  // Check for newly added nodes after input
  for (const [id, afterNode] of afterInfo) {
    if (!beforeInfo.has(id)) {
      // Newly added node
      modifiedNodes.push({
        before: null,
        after: afterNode,
        changeType: 'added',
      });
      
        // Calculate rect for added text
      try {
        const range = document.createRange();
        range.selectNodeContents(afterNode.textNode);
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          addedRects.push(rects[i]);
        }
      } catch {
        // Ignore if rect calculation fails
      }
    }
  }

  return {
    deletedRects: beforeInputDeletedRects,
    addedRects,
    modifiedNodes,
  };
}

