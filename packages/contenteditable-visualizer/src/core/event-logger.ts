export type SiblingInfo = {
  nodeName: string;
  id?: string;
  className?: string;
  textPreview?: string;
};

export type NodeInfo = {
  nodeName: string;
  id?: string;
  className?: string;
  textContent?: string;
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
  parent: { nodeName: string; id?: string; className?: string } | null;
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
};

function getNodeInfo(node: Node | null): EventLog['node'] {
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return {
    nodeName: node.nodeName,
    id: el?.id || undefined,
    className: el?.className || undefined,
    textContent: node.textContent?.substring(0, 50) || undefined,
  };
}

function getParentInfo(node: Node | null): EventLog['parent'] {
  if (!node) return null;
  const parent = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!parent) return null;
  return {
    nodeName: parent.nodeName,
    id: parent.id || undefined,
    className: parent.className || undefined,
  };
}

function getSiblingInfo(sibling: Node | null): SiblingInfo | null {
  if (!sibling) return null;
  const info: SiblingInfo = { nodeName: sibling.nodeName };
  if (sibling.nodeType === Node.ELEMENT_NODE) {
    const el = sibling as Element;
    if (el.id) info.id = el.id;
    if (el.className) info.className = el.className;
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
   * @param maxLogs - Maximum number of logs to keep (0 = unlimited, default: 1000)
   */
  constructor(maxLogs: number = 1000) {
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
      
      if (!range.collapsed) {
        log.endParent = getParentInfo(range.endContainer);
        log.endNode = getNodeInfo(range.endContainer);
        log.endOffset = range.endOffset;
        log.endContainerText = range.endContainer.textContent?.substring(0, 100);
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

