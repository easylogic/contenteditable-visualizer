/**
 * Event Viewer Utilities - DevTools-style event display helpers
 * Inspired by zero-js/zero-core devtool plugin
 */

import type { EventLog } from '../core/event-logger';

/**
 * Format ID for display - distinguishes tracking IDs from real DOM IDs
 */
function formatIdForDisplay(id: string): string {
  // If it's our tracking ID (starts with 'cev-'), use different format
  if (id.startsWith('cev-')) {
    return `@${id}`; // Use @ prefix for tracking IDs
  }
  // Real DOM ID uses # prefix
  return `#${id}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalize debug text - convert special characters to readable tokens
 */
function normalizeDebugText(value: string): string {
  return value
    .replace(/\uFEFF/g, '<zwnbsp>')  // Zero-Width Non-Breaking Space
    .replace(/\u00A0/g, '<nbsp>')    // Non-Breaking Space
    .replace(/\n/g, '<lf>')           // Line Feed
    .replace(/ /g, '<space>');        // Regular space
}

/**
 * Highlight special character tokens in escaped HTML
 */
function highlightSpecialChars(escapedValue: string): string {
  return escapedValue
    .replace(
      /&lt;zwnbsp&gt;/g,
      '<span class="cev-special-char cev-special-char--zwnbsp">&lt;zwnbsp&gt;</span>'
    )
    .replace(
      /&lt;nbsp&gt;/g,
      '<span class="cev-special-char cev-special-char--nbsp">&lt;nbsp&gt;</span>'
    )
    .replace(
      /&lt;lf&gt;/g,
      '<span class="cev-special-char cev-special-char--lf">&lt;lf&gt;</span>'
    )
    .replace(
      /&lt;space&gt;/g,
      '<span class="cev-special-char cev-special-char--space">&lt;space&gt;</span>'
    );
}

/**
 * Render text segment with special character highlighting
 */
function renderTextSegment(value: string): string {
  if (!value) return '';
  
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const normalized = normalizeDebugText(char);
    const escaped = escapeHtml(normalized);
    const highlighted = highlightSpecialChars(escaped);
    parts.push(highlighted);
  }
  
  return parts.join('');
}

/**
 * Extract last composition/beforeinput/input sets from logs
 * Similar to zero-js extractLastSets function
 */
export function extractLastSets(allLogs: EventLog[], maxSets: number = 1): EventLog[][] {
  const sets: EventLog[][] = [];
  let current: { cs?: EventLog; bi?: EventLog; in?: EventLog } = {};
  
  // Time threshold for set separation (100ms)
  const SET_TIME_THRESHOLD_MS = 100;
  
  for (const log of allLogs) {
    if (log.type === 'compositionstart') {
      // compositionstart always starts a new set
      if (current.cs || current.bi || current.in) {
        const arr = [current.cs, current.bi, current.in].filter(Boolean) as EventLog[];
        if (arr.length > 0) {
          sets.push(arr);
        }
        current = {};
      }
      current.cs = log;
    } else if (log.type === 'beforeinput') {
      // Check if beforeinput is too far from current set or has different data
      const shouldStartNewSet =
        (current.bi || current.in) &&
        (current.bi
          ? Math.abs(log.timestamp - current.bi.timestamp) > SET_TIME_THRESHOLD_MS ||
            (log.data !== current.bi.data && log.data !== null && current.bi.data !== null)
          : current.in
            ? Math.abs(log.timestamp - current.in.timestamp) > SET_TIME_THRESHOLD_MS ||
              (log.data !== current.in.data && log.data !== null && current.in.data !== null)
            : false);
      
      if (shouldStartNewSet) {
        const arr = [current.cs, current.bi, current.in].filter(Boolean) as EventLog[];
        if (arr.length > 0) {
          sets.push(arr);
        }
        current = { cs: current.cs }; // Keep compositionstart
      }
      current.bi = log;
    } else if (log.type === 'input') {
      // Check if input is too far from beforeinput or has different data
      const shouldStartNewSet =
        current.bi &&
        (Math.abs(log.timestamp - current.bi.timestamp) > SET_TIME_THRESHOLD_MS ||
          (log.data !== current.bi.data && log.data !== null && current.bi.data !== null));
      
      if (shouldStartNewSet) {
        const arr = [current.cs, current.bi, current.in].filter(Boolean) as EventLog[];
        if (arr.length > 0) {
          sets.push(arr);
        }
        current = { cs: current.cs }; // Keep compositionstart
      }
      current.in = log;
    }
  }
  
  if (current.cs || current.bi || current.in) {
    const arr = [current.cs, current.bi, current.in].filter(Boolean) as EventLog[];
    if (arr.length > 0) {
      sets.push(arr);
    }
  }
  
  if (sets.length === 0) {
    return [];
  }
  
  const start = Math.max(sets.length - maxSets, 0);
  return sets.slice(start);
}

/**
 * Create selection preview with highlighting
 */
export function makeSelectionPreview(log: EventLog, baseTextForPreview: string): {
  html: string;
  linearStart: number;
  linearEnd: number;
  totalLength: number;
} {
  const baseText = log.type === 'input'
    ? (log.startContainerText || baseTextForPreview || '').toString()
    : (log.startContainerText || '').toString();
  
  if (!baseText) {
    return {
      html: '',
      linearStart: 0,
      linearEnd: 0,
      totalLength: 0,
    };
  }
  
  const isElementNode = log.node?.nodeName !== '#text';
  const isTextNode = log.node?.nodeName === '#text';
  
  let start: number;
  let end: number;
  
  if (isElementNode) {
    // For Element nodes (including contenteditable=false):
    // - offset represents child index in parent, not character position
    // - If startContainer is the element itself, offset 0 = before first child
    // - We can't meaningfully show text selection for element nodes
    // - Instead, show the element's text content with offset info
    const offset = log.startOffset ?? 0;
    
    // For element nodes, we show the full text content
    // but indicate that offset is a child index, not character position
    start = 0;
    end = baseText.length;
    
    // Note: If we wanted to show offset as child index, we could do:
    // start = offset; // This would be misleading for text display
    // Instead, we show full text and offset is displayed separately in the phase block
  } else if (isTextNode) {
    // For Text nodes: offset is character position
    const len = baseText.length;
    start = Math.max(0, Math.min(len, log.startOffset ?? 0));
    const endRaw = log.endOffset ?? start;
    end = Math.max(start, Math.min(len, endRaw));
  } else {
    // Fallback: treat as text node
    const len = baseText.length;
    start = Math.max(0, Math.min(len, log.startOffset ?? 0));
    const endRaw = log.endOffset ?? start;
    end = Math.max(start, Math.min(len, endRaw));
  }
  
  const before = baseText.slice(0, start);
  const middle = baseText.slice(start, end);
  const after = baseText.slice(end);
  
  const beforeHtml = renderTextSegment(before);
  const middleHtml = renderTextSegment(middle);
  const afterHtml = renderTextSegment(after);
  
  let html: string;
  if (end > start) {
    html = `${beforeHtml}<span class="cev-selection-range">${middleHtml}</span>${afterHtml}`;
  } else {
    const caretOnlyHtml = '<span class="cev-caret">|</span>';
    html = `${beforeHtml}${caretOnlyHtml}${afterHtml}`;
  }
  
  return {
    html,
    linearStart: start,
    linearEnd: end,
    totalLength: baseText.length,
  };
}

/**
 * Create a phase block (DevTools style)
 */
export function createPhaseBlock(
  title: string,
  log: EventLog | null,
  baseTextForPreview: string,
  options?: {
    extraClassName?: string;
    timestampMs?: number | null;
    deltaMs?: number | null;
    extraLines?: string[];
    beforeLog?: EventLog | null; // beforeinput log for variant detection
  }
): HTMLDivElement | null {
  if (!log) {
    return null;
  }
  
  const block = document.createElement('div');
  block.className = 'cev-phase-block';
  if (options?.extraClassName) {
    block.className += ` ${options.extraClassName}`;
  }
  
  const header = document.createElement('div');
  header.className = 'cev-phase-header';
  const headerText = document.createElement('span');
  if (options?.timestampMs != null) {
    const deltaStr = options.deltaMs != null && !Number.isNaN(options.deltaMs) 
      ? `, Δ=${options.deltaMs}ms` 
      : '';
    headerText.textContent = `${title} (t=${options.timestampMs}${deltaStr})`;
  } else {
    headerText.textContent = title;
  }
  header.appendChild(headerText);
  block.appendChild(header);
  
  const body = document.createElement('pre');
  body.className = 'cev-phase-body';
  
  const parentName = log.parent?.nodeName || '';
  const parentId = log.parent?.id || '';
  const parentClass = log.parent?.className || '';
  const parentContentEditable = log.parent?.contentEditable;
  const parentIdSegment = parentId ? formatIdForDisplay(parentId) : '';
  const parentClassSegment = parentClass ? `.${parentClass}` : '';
  const parentContentEditableSegment = parentContentEditable === 'false' ? '[contenteditable=false]' : '';
  
  const nodeName = log.node?.nodeName || '';
  const nodeId = log.node?.id || '';
  const nodeClass = log.node?.className || '';
  const nodeContentEditable = log.node?.contentEditable;
  const nodeIdSegment = nodeId ? formatIdForDisplay(nodeId) : '';
  const nodeClassSegment = nodeClass ? `.${nodeClass}` : '';
  const nodeContentEditableSegment = nodeContentEditable === 'false' ? '[contenteditable=false]' : '';
  
  // Determine parent/node variant based on beforeinput connection
  let parentVariant: 'before' | 'neutral' = 'neutral';
  let nodeVariant: 'before' | 'neutral' = 'neutral';
  
  if (options?.beforeLog) {
    const beforeParentId = options.beforeLog.parent?.id || '';
    const beforeNodeId = options.beforeLog.node?.id || '';
    
    // Check if current parent matches beforeinput's parent or node
    if (parentId && (parentId === beforeParentId || parentId === beforeNodeId)) {
      parentVariant = 'before';
    }
    
    // Check if current node matches beforeinput's parent or node
    if (nodeId && (nodeId === beforeParentId || nodeId === beforeNodeId)) {
      nodeVariant = 'before';
    }
  }
  
  const selectionPreviewInfo = makeSelectionPreview(log, baseTextForPreview);
  const selectionPreview = selectionPreviewInfo.html;
  
  const rawDataText = (log.data ?? '').toString();
  const dataTextNormalized = normalizeDebugText(rawDataText);
  const dataTextEscaped = escapeHtml(dataTextNormalized);
  const dataText = highlightSpecialChars(dataTextEscaped);
  
  const parentVariantClass = parentVariant === 'before' ? ' cev-parent-tag--before' : '';
  const nodeVariantClass = nodeVariant === 'before' ? ' cev-node-tag--before' : '';
  
  const typeLine = `<span class="cev-phase-key">type:</span> ${escapeHtml(log.type)} (${escapeHtml(log.inputType || '-')})`;
  const parentLine = `<span class="cev-phase-key">parent:</span> <span class="cev-parent-tag${parentVariantClass}">${escapeHtml(parentName)}</span><span class="cev-phase-id">${escapeHtml(parentIdSegment + parentClassSegment + parentContentEditableSegment)}</span>`;
  const nodeLine = `<span class="cev-phase-key">&nbsp;&nbsp;&nbsp;node:</span> <span class="cev-node-tag${nodeVariantClass}">${escapeHtml(nodeName)}</span><span class="cev-phase-id">${escapeHtml(nodeIdSegment + nodeClassSegment + nodeContentEditableSegment)}</span>`;
  
  const startOffsetValue = (log.startOffset ?? '').toString();
  const endOffsetValue = (log.endOffset ?? '').toString();
  const offsetLine = `<span class="cev-phase-key">offset:</span> start=<span class="cev-phase-offset">${escapeHtml(startOffsetValue)}</span>, end=<span class="cev-phase-offset">${escapeHtml(endOffsetValue)}</span>`;
  
  const textLine = `<span class="cev-phase-key">selection:</span> ${selectionPreview}`;
  
  const lines: string[] = [typeLine, parentLine, nodeLine, textLine, offsetLine];
  
  // Add index line if available
  if (log.childIndex != null && log.childCount != null) {
    lines.push(`<span class="cev-phase-key">index:</span> ${log.childIndex} / ${log.childCount}`);
  }
  
  // Add element structure info if available
  // Shows all children in the target element (e.g., BR tags and text nodes in P)
  // Target is either startContainer (if element) or parent (if text node)
  if (log.parentChildren && log.parentChildren.length > 0) {
    const childrenInfo = log.parentChildren.map(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        return `#text[${child.index}]`;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const contentEditableSegment = child.contentEditable === 'false' ? '[contenteditable=false]' : '';
        return `${child.tagName || child.nodeName}[${child.index}]${contentEditableSegment}`;
      } else {
        return `${child.nodeName}[${child.index}]`;
      }
    }).join(', ');
    const isStartContainerElement = log.node?.nodeName && log.node.nodeName !== '#text';
    const label = isStartContainerElement ? 'children:' : 'parent children:';
    lines.push(`<span class="cev-phase-key">${label}</span> <span class="cev-node-tag">${escapeHtml(childrenInfo)}</span>`);
  }
  
  // Add left/right sibling info
  // Check if siblings match beforeinput's node/parent for variant styling
  let leftVariant: 'before' | 'neutral' = 'neutral';
  let rightVariant: 'before' | 'neutral' = 'neutral';
  
  if (options?.beforeLog) {
    const beforeNodeId = options.beforeLog.node?.id || '';
    const beforeParentId = options.beforeLog.parent?.id || '';
    
    if (log.leftSibling) {
      const leftId = log.leftSibling.id || '';
      if (leftId && (leftId === beforeNodeId || leftId === beforeParentId)) {
        leftVariant = 'before';
      }
    }
    
    if (log.rightSibling) {
      const rightId = log.rightSibling.id || '';
      if (rightId && (rightId === beforeNodeId || rightId === beforeParentId)) {
        rightVariant = 'before';
      }
    }
  }
  
  if (log.leftSibling) {
    const leftId = log.leftSibling.id ? ` <span class="cev-phase-id">${escapeHtml(formatIdForDisplay(log.leftSibling.id))}</span>` : '';
    const leftClass = log.leftSibling.className ? `.${escapeHtml(log.leftSibling.className)}` : '';
    const leftContentEditable = log.leftSibling.contentEditable === 'false' ? ` <span class="cev-phase-id">[contenteditable=false]</span>` : '';
    let leftText = '';
    if (log.leftSibling.textPreview && log.leftSibling.nodeName === '#text') {
      // Normalize and highlight special characters like in selection preview
      const normalized = normalizeDebugText(log.leftSibling.textPreview);
      const escaped = escapeHtml(normalized);
      const highlighted = highlightSpecialChars(escaped);
      leftText = ` <span class="cev-phase-text">"${highlighted}"</span>`;
    }
    const leftName = log.leftSibling.nodeName === '#text' ? '#text' : escapeHtml(log.leftSibling.nodeName);
    const leftVariantClass = leftVariant === 'before' ? ' cev-node-tag--before' : '';
    lines.push(`<span class="cev-phase-key">left:</span> <span class="cev-node-tag${leftVariantClass}">${leftName}</span><span class="cev-phase-id">${leftId}${leftClass}</span>${leftContentEditable}${leftText}`);
  }
  
  if (log.rightSibling) {
    const rightId = log.rightSibling.id ? ` <span class="cev-phase-id">${escapeHtml(formatIdForDisplay(log.rightSibling.id))}</span>` : '';
    const rightClass = log.rightSibling.className ? `.${escapeHtml(log.rightSibling.className)}` : '';
    const rightContentEditable = log.rightSibling.contentEditable === 'false' ? ` <span class="cev-phase-id">[contenteditable=false]</span>` : '';
    let rightText = '';
    if (log.rightSibling.textPreview && log.rightSibling.nodeName === '#text') {
      // Normalize and highlight special characters like in selection preview
      const normalized = normalizeDebugText(log.rightSibling.textPreview);
      const escaped = escapeHtml(normalized);
      const highlighted = highlightSpecialChars(escaped);
      rightText = ` <span class="cev-phase-text">"${highlighted}"</span>`;
    }
    const rightName = log.rightSibling.nodeName === '#text' ? '#text' : escapeHtml(log.rightSibling.nodeName);
    const rightVariantClass = rightVariant === 'before' ? ' cev-node-tag--before' : '';
    lines.push(`<span class="cev-phase-key">right:</span> <span class="cev-node-tag${rightVariantClass}">${rightName}</span><span class="cev-phase-id">${rightId}${rightClass}</span>${rightContentEditable}${rightText}`);
  }
  
  if (dataText) {
    lines.push(`<span class="cev-phase-key">data:</span> ${dataText}`);
  }
  
  // Add extra lines (e.g., scenario info)
  if (options?.extraLines && options.extraLines.length > 0) {
    options.extraLines.forEach(line => {
      lines.push(`<span class="cev-phase-key">${escapeHtml(line)}</span>`);
    });
  }
  
  body.innerHTML = lines.join('\n');
  block.appendChild(body);
  
  return block;
}

