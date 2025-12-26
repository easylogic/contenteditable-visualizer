/**
 * Range drawing information
 */
export type RangeDrawInfo = {
  /** The Range object to visualize */
  range: Range;
  /** Fill color (CSS color value) */
  fill: string;
  /** Stroke color (CSS color value) */
  stroke: string;
  /** Height scale factor (default: 1) */
  heightScale?: number;
  /** Type of range: 'selection' | 'composition' | 'beforeinput' | 'input' */
  type?: string;
};

/**
 * Rectangle drawing information for DOM changes
 */
export type RectDrawInfo = {
  /** The DOMRect to visualize */
  rect: DOMRect;
  /** Fill color (CSS color value) */
  fill: string;
  /** Stroke color (CSS color value) */
  stroke: string;
  /** Optional label for the rect */
  label?: string;
};

/**
 * RangeVisualizer - Visualizes ranges and DOM changes using SVG overlay
 * 
 * @example
 * ```typescript
 * const visualizer = new RangeVisualizer(editorElement, overlayElement);
 * visualizer.drawRanges([{
 *   range: selection.getRangeAt(0),
 *   fill: 'rgba(59, 130, 246, 0.2)',
 *   stroke: 'rgba(59, 130, 246, 0.8)',
 *   type: 'selection'
 * }]);
 * ```
 */
export class RangeVisualizer {
  private editorEl: HTMLElement;
  private overlayEl: HTMLElement;
  private isFixed: boolean; // Whether overlay is fixed to document.body

  constructor(editorEl: HTMLElement, overlayEl: HTMLElement) {
    this.editorEl = editorEl;
    this.overlayEl = overlayEl;
    // Check if overlay is fixed (attached to document.body or other fixed container)
    const computedStyle = window.getComputedStyle(overlayEl);
    this.isFixed = computedStyle.position === 'fixed';
  }

  private ensureSvg(): SVGSVGElement {
    let svg = this.overlayEl.querySelector('.range-overlay') as SVGSVGElement;
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('range-overlay');
      Object.assign(svg.style, {
        position: 'absolute',
        inset: '0',
        zIndex: '10',
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'visible',
      });
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      this.overlayEl.appendChild(svg);
    }
    return svg;
  }

  /**
   * Draws ranges on the overlay
   * 
   * @param ranges - Array of range drawing information
   */
  public drawRanges(ranges: RangeDrawInfo[]): void {
    const svg = this.ensureSvg();
    svg.querySelector('g[data-layer="rects"]')?.remove();
    
    if (!ranges || ranges.length === 0) {
      return;
    }
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.layer = 'rects';
    g.setAttribute('data-ui', 'range-rects');
    svg.appendChild(g);

    const editorRect = this.editorEl.getBoundingClientRect();

    for (const item of ranges) {
      const { range, fill, stroke, heightScale = 1 } = item;
      let clientRects: DOMRectList | DOMRect[] = range.getClientRects();

      // For collapsed ranges (cursor only), use the actual range position
      // Don't artificially extend to 1 character - use the exact collapsed position
      if (range.collapsed) {
        // Use getBoundingClientRect() for collapsed ranges to get cursor position
        try {
          const rect = range.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            // Fallback: try to get position from start container
            const container = range.startContainer;
            const offset = range.startOffset;
            if (container.nodeType === Node.TEXT_NODE) {
              const textNode = container as Text;
              // Create a minimal range at the exact cursor position (0 width)
              const tempRange = document.createRange();
              tempRange.setStart(textNode, Math.min(textNode.length, offset));
              tempRange.setEnd(textNode, Math.min(textNode.length, offset));
              const tempRects = tempRange.getClientRects();
              if (tempRects.length > 0) {
                clientRects = tempRects;
              }
            }
          } else {
            // Use the bounding rect directly (will have width 0 for collapsed range)
            clientRects = [rect];
          }
        } catch { 
          // Fallback to original getClientRects
        }
      }

      // Check if selection is at boundary (for both collapsed and non-collapsed ranges)
      let startBoundary = false;
      let endBoundary = false;
      if (item.type === 'selection') {
        // Check start boundary
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = startContainer as Text;
          if (startOffset === 0) {
            startBoundary = true;
          }
        } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
          const element = startContainer as Element;
          if (startOffset === 0) {
            startBoundary = true;
          }
        }
        
        // Check end boundary
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        if (endContainer.nodeType === Node.TEXT_NODE) {
          const textNode = endContainer as Text;
          if (endOffset === textNode.length) {
            endBoundary = true;
          }
        } else if (endContainer.nodeType === Node.ELEMENT_NODE) {
          const element = endContainer as Element;
          if (endOffset === element.childNodes.length) {
            endBoundary = true;
          }
        }
      }

      for (const r of clientRects) {
        // For collapsed ranges, allow 0 width to show cursor position
        if (r.width === 0 && r.height === 0 && !range.collapsed) continue;

        if (item.type === 'composition' && r.width < 2) {
          continue;
        }

        // Calculate coordinates based on overlay position
        let x: number;
        let y: number;
        let height: number;

        if (this.isFixed) {
          // Overlay is fixed (e.g., document.body), use viewport coordinates
          x = r.left + window.scrollX;
          y = r.top + window.scrollY;
          height = r.height;
        } else {
          // Overlay is relative to editor element
          x = r.left - editorRect.left + this.editorEl.scrollLeft;
          y = r.top - editorRect.top + this.editorEl.scrollTop;
          height = r.height;
        }

        if (item.type === 'composition') {
          if (this.isFixed) {
            y = r.top + window.scrollY + r.height - 1;
          } else {
            y = r.top - editorRect.top + this.editorEl.scrollTop + r.height - 1;
          }
          height = 1;
        } else if (item.type === 'beforeinput') {
          if (this.isFixed) {
            y = r.top + window.scrollY + r.height - 1;
          } else {
            y = r.top - editorRect.top + this.editorEl.scrollTop + r.height - 1;
          }
          height = 1;
        } else if (heightScale !== 1) {
          const newHeight = r.height * heightScale;
          y -= (newHeight - r.height) / 2;
          height = newHeight;
        }

        // Boundary check
        if (this.isFixed) {
          // For fixed overlay, check against viewport
          if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
            continue;
          }
        } else {
          // For relative overlay, check against editor bounds
          if (x < 0 || y < 0 || x > editorRect.width || y > editorRect.height + this.editorEl.scrollHeight) {
            continue;
          }
        }

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('data-ui', `range-rect-${item.type || 'unknown'}`);
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        // For collapsed ranges, use actual width (0 or very small), don't force minimum
        // For non-collapsed ranges, ensure minimum width for visibility
        const rectWidth = range.collapsed ? Math.max(r.width, 1) : Math.max(r.width, 2);
        rect.setAttribute('width', rectWidth.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', '1');
        g.appendChild(rect);
      }
      
      // Draw boundary markers after all rects are drawn
      // For collapsed ranges, draw at the cursor position
      // For non-collapsed ranges, draw at start and end positions
      if (item.type === 'selection') {
        const markerSize = 6;
        
        if (range.collapsed) {
          // For collapsed range, check if at boundary and draw marker at cursor position
          if (startBoundary || endBoundary) {
            const firstRect = clientRects[0];
            if (firstRect) {
              let x: number;
              let y: number;
              
              if (this.isFixed) {
                x = firstRect.left + window.scrollX;
                y = firstRect.top + window.scrollY;
              } else {
                x = firstRect.left - editorRect.left + this.editorEl.scrollLeft;
                y = firstRect.top - editorRect.top + this.editorEl.scrollTop;
              }
              
              const boundaryType = startBoundary ? 'start' : 'end';
              this.drawBoundaryMarker(g, x, y, firstRect.height, boundaryType, markerSize);
            }
          }
        } else {
          // For non-collapsed range, draw markers at start and end positions
          if (startBoundary && clientRects.length > 0) {
            const firstRect = clientRects[0];
            let x: number;
            let y: number;
            
            if (this.isFixed) {
              x = firstRect.left + window.scrollX;
              y = firstRect.top + window.scrollY;
            } else {
              x = firstRect.left - editorRect.left + this.editorEl.scrollLeft;
              y = firstRect.top - editorRect.top + this.editorEl.scrollTop;
            }
            
            this.drawBoundaryMarker(g, x, y, firstRect.height, 'start', markerSize);
          }
          
          if (endBoundary && clientRects.length > 0) {
            const lastRect = clientRects[clientRects.length - 1];
            let x: number;
            let y: number;
            
            if (this.isFixed) {
              x = lastRect.right + window.scrollX;
              y = lastRect.top + window.scrollY;
            } else {
              x = lastRect.right - editorRect.left + this.editorEl.scrollLeft;
              y = lastRect.top - editorRect.top + this.editorEl.scrollTop;
            }
            
            this.drawBoundaryMarker(g, x, y, lastRect.height, 'end', markerSize);
          }
        }
      }

      if (item.type === 'selection' && !range.collapsed) {
        this.drawNonEditableAreas(range, g, editorRect);
      }
    }
    
    // Draw invisible characters for selection ranges (both collapsed and non-collapsed)
    for (const item of ranges) {
      if (item.type === 'selection') {
        this.drawInvisibleCharacters(item.range, svg, editorRect);
      }
    }
  }

  private drawBoundaryMarker(
    g: SVGGElement,
    x: number,
    y: number,
    height: number,
    boundaryType: 'start' | 'end',
    markerSize: number
  ): void {
    // Draw a triangle marker pointing to the boundary
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    marker.setAttribute('data-ui', `boundary-marker-${boundaryType}`);
    marker.setAttribute('data-boundary', boundaryType);
    
    if (boundaryType === 'start') {
      // Start boundary: triangle pointing down (위에서 아래로)
      // Position at the top of the text, pointing downward
      const markerY = y - markerSize - 2; // Position above the text
      marker.setAttribute('points', 
        `${x},${markerY + markerSize} ` +                    // Bottom point (arrow tip pointing down)
        `${x - markerSize},${markerY} ` +  // Left point
        `${x + markerSize},${markerY}`     // Right point
      );
    } else {
      // End boundary: triangle pointing up (아래에서 위로)
      // Position at the bottom of the text, pointing upward
      const markerY = y + height + 2; // Position below the text
      marker.setAttribute('points', 
        `${x - markerSize},${markerY + markerSize} ` +  // Left point (bottom)
        `${x + markerSize},${markerY + markerSize} ` +  // Right point (bottom)
        `${x},${markerY}`      // Top point (arrow tip pointing up)
      );
    }
    
    marker.setAttribute('fill', '#f59e0b'); // Orange color for boundary
    marker.setAttribute('stroke', '#d97706');
    marker.setAttribute('stroke-width', '1');
    marker.setAttribute('opacity', '0.9');
    marker.setAttribute('title', `Boundary: ${boundaryType}`);
    g.appendChild(marker);
  }

  private drawNonEditableAreas(range: Range, g: SVGGElement, editorRect: DOMRect): void {
    try {
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      const nonEditableElements: Element[] = [];
      let node: Node | null = walker.nextNode();
      
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (range.intersectsNode(element)) {
            const contentEditable = element.getAttribute('contenteditable');
            const htmlContentEditable = (element as HTMLElement).contentEditable;
            
            if (contentEditable === 'false' || htmlContentEditable === 'false') {
              nonEditableElements.push(element);
            }
          }
        }
        node = walker.nextNode();
      }

      for (const element of nonEditableElements) {
        const rects = element.getClientRects();
        for (const r of rects) {
          if (r.width === 0 && r.height === 0) continue;

          let x: number;
          let y: number;
          const height = r.height;

          if (this.isFixed) {
            x = r.left + window.scrollX;
            y = r.top + window.scrollY;
          } else {
            x = r.left - editorRect.left + this.editorEl.scrollLeft;
            y = r.top - editorRect.top + this.editorEl.scrollTop;
          }

          // Boundary check
          if (this.isFixed) {
            if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
              continue;
            }
          } else {
            if (x < 0 || y < 0 || x > editorRect.width || y > editorRect.height + this.editorEl.scrollHeight) {
              continue;
            }
          }

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('data-ui', 'range-rect-noneditable');
          rect.setAttribute('x', x.toString());
          rect.setAttribute('y', y.toString());
          rect.setAttribute('width', Math.max(r.width, 2).toString());
          rect.setAttribute('height', height.toString());
          rect.setAttribute('fill', 'rgba(107, 114, 128, 0.3)');
          rect.setAttribute('stroke', 'rgba(107, 114, 128, 0.8)');
          rect.setAttribute('stroke-width', '1');
          g.appendChild(rect);
        }
      }
    } catch (error) {
      console.warn('Failed to draw non-editable areas:', error);
    }
  }

  /**
   * Draws rectangles for DOM changes
   * 
   * @param rects - Array of rectangle drawing information
   */
  public drawRects(rects: RectDrawInfo[]): void {
    const svg = this.ensureSvg();
    svg.querySelector('g[data-layer="dom-changes"]')?.remove();
    // Remove target ranges when drawing DOM changes to avoid overlap
    svg.querySelector('g[data-layer="target-ranges"]')?.remove();
    
    if (!rects || rects.length === 0) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.layer = 'dom-changes';
    g.setAttribute('data-ui', 'dom-change-rects');
    svg.appendChild(g);

    const editorRect = this.editorEl.getBoundingClientRect();

    for (const item of rects) {
      const { rect, fill, stroke, label } = item;
      if (rect.width === 0 && rect.height === 0) continue;

      let x: number;
      let y: number;

      if (this.isFixed) {
        x = rect.left + window.scrollX;
        y = rect.top + window.scrollY;
      } else {
        x = rect.left - editorRect.left + this.editorEl.scrollLeft;
        y = rect.top - editorRect.top + this.editorEl.scrollTop;
      }

      // Boundary check
      if (this.isFixed) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
          continue;
        }
      } else {
        if (x < 0 || y < 0 || x > editorRect.width || y > editorRect.height + this.editorEl.scrollHeight) {
          continue;
        }
      }

      const svgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      svgRect.setAttribute('data-ui', `dom-change-rect-${label || 'unknown'}`);
      svgRect.setAttribute('x', x.toString());
      svgRect.setAttribute('y', y.toString());
      svgRect.setAttribute('width', Math.max(rect.width, 2).toString());
      svgRect.setAttribute('height', rect.height.toString());
      svgRect.setAttribute('fill', fill);
      svgRect.setAttribute('stroke', stroke);
      svgRect.setAttribute('stroke-width', '1');
      if (label) {
        svgRect.setAttribute('data-label', label);
      }
      g.appendChild(svgRect);
    }
  }

  public drawTargetRanges(targetRanges: StaticRange[]): void {
    const svg = this.ensureSvg();
    svg.querySelector('g[data-layer="target-ranges"]')?.remove();
    
    if (!targetRanges || targetRanges.length === 0) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.layer = 'target-ranges';
    g.setAttribute('data-ui', 'target-ranges');
    svg.appendChild(g);

    const editorRect = this.editorEl.getBoundingClientRect();

    for (let i = 0; i < targetRanges.length; i++) {
      const tr = targetRanges[i];
      try {
        const range = document.createRange();
        range.setStart(tr.startContainer, tr.startOffset);
        range.setEnd(tr.endContainer, tr.endOffset);
        
        const clientRects = range.getClientRects();
        for (let j = 0; j < clientRects.length; j++) {
          const r = clientRects[j];
          if (r.width === 0 && r.height === 0) continue;

          let x: number;
          let y: number;

          if (this.isFixed) {
            x = r.left + window.scrollX;
            y = r.top + window.scrollY;
          } else {
            x = r.left - editorRect.left + this.editorEl.scrollLeft;
            y = r.top - editorRect.top + this.editorEl.scrollTop;
          }

          // Boundary check
          if (this.isFixed) {
            if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
              continue;
            }
          } else {
            if (x < 0 || y < 0 || x > editorRect.width || y > editorRect.height + this.editorEl.scrollHeight) {
              continue;
            }
          }

          const svgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          svgRect.setAttribute('data-ui', `target-range-rect-${i}-${j}`);
          svgRect.setAttribute('x', x.toString());
          svgRect.setAttribute('y', y.toString());
          svgRect.setAttribute('width', Math.max(r.width, 2).toString());
          svgRect.setAttribute('height', r.height.toString());
          svgRect.setAttribute('rx', '2');
          svgRect.setAttribute('fill', 'rgba(250, 204, 21, 0.3)');
          svgRect.setAttribute('stroke', 'rgba(250, 204, 21, 0.9)');
          svgRect.setAttribute('stroke-width', '2');
          svgRect.setAttribute('stroke-dasharray', '4 2');
          svgRect.setAttribute('data-label', 'deleted-target-range');
          g.appendChild(svgRect);
        }
      } catch (error) {
        console.warn('Failed to visualize targetRange:', error);
      }
    }
  }

  /**
   * Clears all visualizations
   */
  public clear(): void {
    const svg = this.overlayEl.querySelector('.range-overlay');
    if (svg) {
      svg.querySelector('g[data-layer="rects"]')?.remove();
      svg.querySelector('g[data-layer="boundary"]')?.remove();
      svg.querySelector('g[data-layer="dom-changes"]')?.remove();
      svg.querySelector('g[data-layer="target-ranges"]')?.remove();
      svg.querySelector('g[data-layer="invisible-characters"]')?.remove();
    }
  }

  /**
   * Draws markers for invisible characters (ZWNBSP, NBSP, LF, TAB, etc.)
   * For collapsed ranges, scans the block containing the cursor
   * For non-collapsed ranges, scans only the text nodes within the range
   */
  private drawInvisibleCharacters(range: Range, svg: SVGSVGElement, editorRect: DOMRect): void {
    try {
      svg.querySelector('g[data-layer="invisible-characters"]')?.remove();
      
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.layer = 'invisible-characters';
      g.setAttribute('data-ui', 'invisible-characters');
      svg.appendChild(g);

      // Invisible character definitions with distinct colors
      const invisibleChars = [
        { char: '\uFEFF', name: 'ZWNBSP', symbol: '␀', color: '#ef4444' }, // Zero-Width Non-Breaking Space - Red
        { char: '\n', name: 'LF', symbol: '↵', color: '#3b82f6' }, // Line Feed - Blue
        { char: '\r', name: 'CR', symbol: '␍', color: '#06b6d4' }, // Carriage Return - Cyan
        { char: '\t', name: 'TAB', symbol: '→', color: '#8b5cf6' }, // Tab - Purple
        { char: '\u200B', name: 'ZWSP', symbol: '␠', color: '#ec4899' }, // Zero-Width Space - Pink
        { char: '\u200C', name: 'ZWNJ', symbol: '␟', color: '#f43f5e' }, // Zero-Width Non-Joiner - Rose
        { char: '\u200D', name: 'ZWJ', symbol: '␟', color: '#d946ef' }, // Zero-Width Joiner - Fuchsia
      ];

      // Track drawn positions to avoid duplicates
      const drawnPositions = new Set<string>();

      // Determine which text nodes to scan
      let textNodesToScan: Text[] = [];
      
      if (range.collapsed) {
        // For collapsed range, find the block element containing the cursor
        let blockElement: HTMLElement | null = null;
        let node: Node | null = range.startContainer;
        
        // Walk up to find block element (p, div, etc.)
        while (node && node !== this.editorEl) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const display = window.getComputedStyle(element).display;
            if (display === 'block' || display === 'block-inline' || 
                element.tagName === 'P' || element.tagName === 'DIV' ||
                element.tagName === 'LI' || element.tagName === 'H1' ||
                element.tagName === 'H2' || element.tagName === 'H3' ||
                element.tagName === 'H4' || element.tagName === 'H5' ||
                element.tagName === 'H6') {
              blockElement = element;
              break;
            }
          }
          node = node.parentNode;
        }
        
        // If no block element found, use the editor element
        const scanRoot = blockElement || this.editorEl;
        
        // Walk through all text nodes in the block
        const walker = document.createTreeWalker(
          scanRoot,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
          textNodesToScan.push(textNode as Text);
        }
      } else {
        // For non-collapsed range, scan only text nodes within the range
        const walker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              if (range.intersectsNode(node)) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_REJECT;
            }
          }
        );
        
        let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
          textNodesToScan.push(textNode as Text);
        }
      }

      // Scan each text node for invisible characters
      for (const textNode of textNodesToScan) {
        const text = textNode.textContent || '';
        
        // Check each invisible character
        for (const invChar of invisibleChars) {
          let index = -1;
          while ((index = text.indexOf(invChar.char, index + 1)) !== -1) {
            try {
              // Create a range for this specific character
              const charRange = document.createRange();
              charRange.setStart(textNode, index);
              charRange.setEnd(textNode, index + 1);
              
              // Get the position of this character
              const rects = charRange.getClientRects();
              if (rects.length === 0) continue;
              
              const r = rects[0];
              
              // Calculate coordinates
              let x: number;
              let y: number;
              
              if (this.isFixed) {
                x = r.left + window.scrollX;
                y = r.top + window.scrollY;
              } else {
                x = r.left - editorRect.left + this.editorEl.scrollLeft;
                y = r.top - editorRect.top + this.editorEl.scrollTop;
              }
              
              // Check if we've already drawn a marker at this position (using coordinates only)
              const positionKey = `${x.toFixed(1)}-${y.toFixed(1)}`;
              if (drawnPositions.has(positionKey)) {
                continue; // Skip duplicate
              }
              drawnPositions.add(positionKey);
              
              // Create a diamond (polygon) marker for the invisible character at the top
              // Position diamond higher above the text
              const size = 4;
              const offsetY = -6; // Move diamond up by 6px
              const diamondY = y + offsetY;
              
              const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              marker.setAttribute('data-ui', `invisible-char-${invChar.name}`);
              marker.setAttribute('data-char', invChar.name);
              // Diamond shape: top, right, bottom, left points
              marker.setAttribute('points', 
                `${x},${diamondY - size} ` +  // top
                `${x + size},${diamondY} ` +  // right
                `${x},${diamondY + size} ` +  // bottom
                `${x - size},${diamondY}`     // left
              );
              marker.setAttribute('fill', invChar.color);
              marker.setAttribute('stroke', invChar.color);
              marker.setAttribute('stroke-width', '2');
              marker.setAttribute('opacity', '1');
              
              // Add tooltip title
              marker.setAttribute('title', `${invChar.name} (${invChar.symbol})`);
              
              g.appendChild(marker);
              
              // Draw a dashed line from diamond to bottom
              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', x.toString());
              line.setAttribute('y1', diamondY.toString());
              line.setAttribute('x2', x.toString());
              line.setAttribute('y2', (y + r.height).toString());
              line.setAttribute('stroke', invChar.color);
              line.setAttribute('stroke-width', '2');
              line.setAttribute('stroke-dasharray', '2 2');
              line.setAttribute('opacity', '0.8');
              g.appendChild(line);
            } catch (error) {
              // Skip if range creation fails
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to draw invisible characters:', error);
    }
  }

  /**
   * Destroys the visualizer and removes the overlay
   */
  public destroy(): void {
    this.overlayEl.querySelector('.range-overlay')?.remove();
  }
}

