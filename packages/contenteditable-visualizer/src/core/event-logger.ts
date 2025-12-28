import { getElementId } from '../utils/element-id';
import { getTextNodeId } from './text-node-tracker';

export type SiblingInfo = {
  nodeName: string;
  id?: string;
  className?: string;
  textPreview?: string;
  contentEditable?: string | null;
};

export type NodeInfo = {
  nodeName: string;
  id?: string;
  className?: string;
  textContent?: string;
  contentEditable?: string | null; // 'true', 'false', 'inherit', or null
};

export type TargetRangeInfo = {
  startContainer: string;
  startOffset: number;
  endContainer: string;
  endOffset: number;
  collapsed: boolean;
};

export type EventLog = {
  id: number;
  timestamp: number;
  type: 'selectionchange' | 'compositionstart' | 'compositionupdate' | 'compositionend' | 'beforeinput' | 'input';
  inputType?: string;
  data?: string | null;
  isComposing?: boolean;
  parent: { nodeName: string; id?: string; className?: string; contentEditable?: string | null } | null;
  node: NodeInfo | null;
  startOffset: number;
  startContainerText?: string;
  endParent?: { nodeName: string; id?: string; className?: string } | null;
  endNode?: NodeInfo | null;
  endOffset: number;
  endContainerText?: string;
  range?: Range | null;
  targetRanges?: TargetRangeInfo[];
  startBoundary?: { type: 'start' | 'end'; element: string } | null;
  endBoundary?: { type: 'start' | 'end'; element: string } | null;
  leftSibling?: SiblingInfo | null;
  rightSibling?: SiblingInfo | null;
  childIndex?: number;
  childCount?: number;
  parentChildren?: Array<{ index: number; nodeType: number; nodeName: string; tagName?: string; contentEditable?: string | null }>; // All children in parent
};

function getNodeInfo(node: Node | null): EventLog['node'] {
  if (!node) return null;
  
  let id: string | undefined;
  let className: string | undefined;
  let contentEditable: string | null | undefined = undefined;
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    // For Element nodes, use element's ID
    const element = node as Element;
    id = getElementId(element);
    className = element.className || undefined;
    
    // Get contentEditable attribute value
    const attr = element.getAttribute('contenteditable');
    if (attr !== null) {
      contentEditable = attr;
    } else if ((element as HTMLElement).contentEditable) {
      contentEditable = (element as HTMLElement).contentEditable;
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    // For Text nodes, use text node's unique ID (not parent's ID)
    // This allows distinguishing between different text nodes that share the same parent
    const textNode = node as Text;
    id = getTextNodeId(textNode);
    
    // Also get parent info for context
    const parent = textNode.parentElement;
    if (parent) {
      className = parent.className || undefined;
    }
  }
  
  return {
    nodeName: node.nodeName,
    id: id || undefined,
    className: className,
    textContent: node.textContent?.substring(0, 50) || undefined,
    contentEditable: contentEditable,
    // Note: contenteditable=false elements can be startContainer/endContainer
    // In that case, offset represents child index (0 = before first child, childCount = after last child)
    // Note: Text nodes now have their own unique IDs to distinguish between siblings with the same parent
  };
}

function getParentInfo(node: Node | null): EventLog['parent'] {
  if (!node) return null;
  const parent = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!parent) return null;
  
  // Ensure parent has an ID for tracking
  const id = getElementId(parent);
  
  // Get contentEditable attribute value
  let contentEditable: string | null | undefined = undefined;
  const attr = parent.getAttribute('contenteditable');
  if (attr !== null) {
    contentEditable = attr;
  } else if ((parent as HTMLElement).contentEditable) {
    contentEditable = (parent as HTMLElement).contentEditable;
  }
  
  return {
    nodeName: parent.nodeName,
    id: id || undefined,
    className: parent.className || undefined,
    contentEditable: contentEditable,
  };
}

function getSiblingInfo(sibling: Node | null): SiblingInfo | null {
  if (!sibling) return null;
  const info: SiblingInfo = { nodeName: sibling.nodeName };
  if (sibling.nodeType === Node.ELEMENT_NODE) {
    const el = sibling as Element;
    info.id = getElementId(el);
    if (el.className) info.className = el.className;
    
    // Get contentEditable attribute value
    const attr = el.getAttribute('contenteditable');
    if (attr !== null) {
      info.contentEditable = attr;
    } else if ((el as HTMLElement).contentEditable) {
      info.contentEditable = (el as HTMLElement).contentEditable;
    }
  } else if (sibling.nodeType === Node.TEXT_NODE) {
    const text = sibling.textContent || '';
    info.textPreview = text.length > 20 ? text.substring(0, 20) + '...' : text;
  }
  return info;
}

function getChildPosition(node: Node): { index: number; count: number } | null {
  const parent = node.parentNode;
  if (!parent) return null;
  const children = parent.childNodes;
  for (let i = 0; i < children.length; i++) {
    if (children[i] === node) {
      return { index: i, count: children.length };
    }
  }
  return null;
}

function checkBoundaryAtNode(node: Node, offset: number): { type: 'start' | 'end'; element: string } | null {
  const parent = node.parentElement;
  if (!parent) return null;
  const blockElements = ['P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER'];
  if (blockElements.includes(parent.nodeName)) return null;
  const textLength = node.textContent?.length || 0;
  if (offset === 0) return { type: 'start', element: parent.nodeName };
  if (offset === textLength && textLength > 0) return { type: 'end', element: parent.nodeName };
  return null;
}

function serializeRange(range: Range | null | undefined): any {
  if (!range) return null;
  
  try {
    return {
      collapsed: range.collapsed,
      startContainer: range.startContainer.nodeType === Node.TEXT_NODE 
        ? '#text' 
        : (range.startContainer as Element).tagName || 'unknown',
      startOffset: range.startOffset,
      endContainer: range.endContainer.nodeType === Node.TEXT_NODE 
        ? '#text' 
        : (range.endContainer as Element).tagName || 'unknown',
      endOffset: range.endOffset,
      startContainerText: range.startContainer.textContent?.substring(0, 100) || '',
      endContainerText: range.endContainer.textContent?.substring(0, 100) || '',
    };
  } catch {
    return null;
  }
}

export function serializeEventLog(log: EventLog): any {
  const { range, ...rest } = log;
  return {
    ...rest,
    range: serializeRange(range),
  };
}

/**
 * EventLogger - Collects and logs contenteditable events
 * 
 * @example
 * ```typescript
 * const logger = new EventLogger(1000);
 * logger.onEvent((log) => {
 *   console.log('New event:', log);
 * });
 * ```
 */
export class EventLogger {
  private logs: EventLog[] = [];
  private nextId = 1;
  private callbacks: ((log: EventLog) => void)[] = [];
  private maxLogs: number;

  /**
   * Creates a new EventLogger instance
   * 
   * @param maxLogs - Maximum number of logs to keep (0 = unlimited, default: 20)
   *                   For DevTools-style viewer, we only need recent events to extract the last set
   */
  constructor(maxLogs: number = 20) {
    this.maxLogs = maxLogs;
  }

  /**
   * Registers a callback for new events
   * 
   * @param callback - Function to call when a new event is logged
   * @returns Unsubscribe function
   */
  onEvent(callback: (log: EventLog) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private emit(log: EventLog): void {
    this.callbacks.forEach(cb => cb(log));
  }

  /**
   * Logs a new event
   * 
   * @param type - Event type
   * @param event - The DOM event object
   * @param range - The current selection range
   * @returns The created event log
   */
  logEvent(
    type: EventLog['type'],
    event: Event | InputEvent | CompositionEvent,
    range: Range | null
  ): EventLog {
    const log: EventLog = {
      id: this.nextId++,
      timestamp: Date.now(),
      type,
      parent: null,
      node: null,
      startOffset: 0,
      endOffset: 0,
      range,
    };

    if (event instanceof InputEvent) {
      log.inputType = event.inputType;
      log.data = event.data;
      log.isComposing = event.isComposing;
      
      if (event instanceof InputEvent && 'getTargetRanges' in event) {
        try {
          const targetRanges = event.getTargetRanges();
          log.targetRanges = Array.from(targetRanges).map(tr => ({
            startContainer: tr.startContainer.nodeType === Node.TEXT_NODE ? '#text' : (tr.startContainer as Element).tagName || 'unknown',
            startOffset: tr.startOffset,
            endContainer: tr.endContainer.nodeType === Node.TEXT_NODE ? '#text' : (tr.endContainer as Element).tagName || 'unknown',
            endOffset: tr.endOffset,
            collapsed: tr.collapsed,
          }));
        } catch {
          // getTargetRanges not supported
        }
      }
    }

    if (event instanceof CompositionEvent) {
      log.data = event.data;
      log.isComposing = type !== 'compositionend';
    }

    if (range) {
      log.parent = getParentInfo(range.startContainer);
      log.node = getNodeInfo(range.startContainer);
      log.startOffset = range.startOffset;
      log.startContainerText = range.startContainer.textContent?.substring(0, 100);
      
      // Note: Browser differences for contenteditable=false elements:
      // - Some browsers allow contenteditable=false elements as startContainer/endContainer
      // - In that case, offset represents child index (0 = before first child, childCount = after last child)
      // - This behavior may vary between Chrome, Firefox, Safari, and Edge
      // - Mobile browsers (iOS Safari, Chrome Mobile) may have additional differences
      
      if (!range.collapsed) {
        log.endParent = getParentInfo(range.endContainer);
        log.endNode = getNodeInfo(range.endContainer);
        log.endOffset = range.endOffset;
        log.endContainerText = range.endContainer.textContent?.substring(0, 100);
      } else {
        // For collapsed ranges, endOffset should equal startOffset
        log.endOffset = range.startOffset;
      }

      log.startBoundary = checkBoundaryAtNode(range.startContainer, range.startOffset);
      if (!range.collapsed) {
        log.endBoundary = checkBoundaryAtNode(range.endContainer, range.endOffset);
      }

      const startPos = getChildPosition(range.startContainer);
      if (startPos) {
        log.childIndex = startPos.index;
        log.childCount = startPos.count;
      }

      if (range.startContainer.previousSibling) {
        log.leftSibling = getSiblingInfo(range.startContainer.previousSibling);
      }
      if (range.startContainer.nextSibling) {
        log.rightSibling = getSiblingInfo(range.startContainer.nextSibling);
      }

      // Capture element structure summary for context
      // If startContainer is an element, check its children (e.g., P containing BR)
      // Otherwise, check parent's children (but skip if parent is contenteditable)
      let targetElement: Element | null = null;
      
      if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
        // startContainer itself is an element (e.g., P), check its children
        targetElement = range.startContainer as Element;
      } else {
        // startContainer is a text node, check parent's children
        const parent = range.startContainer.parentElement;
        if (parent && parent.getAttribute('contenteditable') !== 'true') {
          targetElement = parent;
        }
      }
      
      if (targetElement) {
        const children = targetElement.childNodes;
        const allChildren: Array<{ index: number; nodeType: number; nodeName: string; tagName?: string; contentEditable?: string | null }> = [];
        
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          const childInfo: { index: number; nodeType: number; nodeName: string; tagName?: string; contentEditable?: string | null } = {
            index: i,
            nodeType: child.nodeType,
            nodeName: child.nodeName,
          };
          
          if (child.nodeType === Node.ELEMENT_NODE) {
            const element = child as Element;
            childInfo.tagName = element.tagName;
            
            // Get contentEditable attribute value
            const attr = element.getAttribute('contenteditable');
            if (attr !== null) {
              childInfo.contentEditable = attr;
            } else if ((element as HTMLElement).contentEditable) {
              childInfo.contentEditable = (element as HTMLElement).contentEditable;
            }
          }
          
          allChildren.push(childInfo);
        }
        
        // Store all children (elements and text nodes) for context
        if (allChildren.length > 0) {
          log.parentChildren = allChildren;
        }
      }
    }

    this.logs.push(log);
    
    // Limit maximum log count (FIFO)
    if (this.maxLogs > 0 && this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
    
    this.emit(log);
    return log;
  }

  /**
   * Gets all logged events
   * 
   * @returns Copy of all event logs
   */
  getLogs(): EventLog[] {
    return [...this.logs];
  }

  /**
   * Clears all event logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Gets serialized event logs (without Range objects)
   * 
   * @returns Array of serialized event logs
   */
  getSerializedLogs(): any[] {
    return this.logs.map(serializeEventLog);
  }
}

