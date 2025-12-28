import { RangeVisualizer, type RangeDrawInfo, type RectDrawInfo } from './core/range-visualizer';
import { EventLogger, type EventLog } from './core/event-logger';
import { SnapshotManager, type Snapshot, type SnapshotTrigger } from './core/snapshot-manager';
import { snapshotTextNodes } from './core/text-node-tracker';
import { calculateDeletedRects, detectDomChanges, type DomChangeResult } from './core/dom-change-tracker';
import { FloatingPanel, type FloatingPanelOptions } from './ui/floating-panel';
import { throttle } from './utils/throttle';
import { buildAiPrompt } from './utils/prompt-formatter';
import { ensureSubtreeIds } from './utils/element-id';
import type { ContentEditableVisualizerOptions, VisualizerColorScheme, RequiredVisualizerColorScheme, FloatingPanelConfig } from './types';

/**
 * Default color scheme for visualizations
 */
const DEFAULT_COLOR_SCHEME: RequiredVisualizerColorScheme = {
  selection: {
    fill: 'rgba(59, 130, 246, 0.15)',
    stroke: 'rgba(59, 130, 246, 0.6)',
  },
  composition: {
    fill: 'rgba(168, 85, 247, 0.2)',
    stroke: 'rgba(168, 85, 247, 0.8)',
  },
  beforeinput: {
    fill: 'rgba(59, 130, 246, 0.2)',
    stroke: 'rgba(59, 130, 246, 0.8)',
  },
  input: {
    fill: 'rgba(16, 185, 129, 0.2)',
    stroke: 'rgba(16, 185, 129, 0.8)',
  },
  deleted: {
    fill: 'rgba(250, 204, 21, 0.3)',
    stroke: 'rgba(250, 204, 21, 0.8)',
  },
  added: {
    fill: 'rgba(16, 185, 129, 0.3)',
    stroke: 'rgba(16, 185, 129, 0.8)',
  },
};

export type ExportData = {
  events: any[];
  snapshots: Snapshot[];
  environment: {
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    device: string;
    isMobile: boolean;
  };
};

/**
 * ContentEditableVisualizer - Main SDK class
 */
/**
 * ContentEditableVisualizer - Main SDK class
 * 
 * @example
 * ```typescript
 * const visualizer = createVisualizer(editorElement, {
 *   visualize: true,
 *   logEvents: true,
 *   colors: {
 *     selection: { fill: 'rgba(255, 0, 0, 0.2)', stroke: 'rgba(255, 0, 0, 0.8)' }
 *   }
 * });
 * ```
 */
export class ContentEditableVisualizer {
  private element: HTMLElement;
  private overlayEl: HTMLElement;
  private options: Required<Omit<ContentEditableVisualizerOptions, 'colors' | 'onError' | 'container' | 'panel'>> & {
    colors: RequiredVisualizerColorScheme;
    onError?: (error: Error, context: string) => void;
    container?: HTMLElement;
    panel: boolean | FloatingPanelConfig;
  };
  
  private rangeVisualizer: RangeVisualizer | null = null;
  private eventLogger: EventLogger;
  private snapshotManager: SnapshotManager;
  private floatingPanel: FloatingPanel | null = null;

  private beforeInputInfo: Map<string, any> | null = null;
  private beforeInputDeletedRects: DOMRect[] = [];
  private isAttached = false;
  private scrollHandler: (() => void) | null = null;

  private eventListeners: {
    beforeinput: (e: Event) => void;
    input: (e: Event) => void;
    compositionstart: (e: Event) => void;
    compositionupdate: (e: Event) => void;
    compositionend: (e: Event) => void;
    selectionchange: () => void;
  } = {
    beforeinput: () => {},
    input: () => {},
    compositionstart: () => {},
    compositionupdate: () => {},
    compositionend: () => {},
    selectionchange: () => {},
  };

  /**
   * Creates a new ContentEditableVisualizer instance
   * 
   * @param element - The contenteditable element to attach the visualizer to
   * @param options - Configuration options
   * @throws {Error} If element is not a valid HTMLElement
   */
  constructor(element: HTMLElement, options: ContentEditableVisualizerOptions = {}) {
    if (!element || !(element instanceof HTMLElement)) {
      const error = new Error('ContentEditableVisualizer: element must be a valid HTMLElement');
      if (options.onError) {
        options.onError(error, 'constructor');
      }
      throw error;
    }

    this.element = element;
    
    // Merge color scheme with defaults
    const colors: RequiredVisualizerColorScheme = {
      selection: { 
        fill: options.colors?.selection?.fill ?? DEFAULT_COLOR_SCHEME.selection.fill,
        stroke: options.colors?.selection?.stroke ?? DEFAULT_COLOR_SCHEME.selection.stroke,
      },
      composition: { 
        fill: options.colors?.composition?.fill ?? DEFAULT_COLOR_SCHEME.composition.fill,
        stroke: options.colors?.composition?.stroke ?? DEFAULT_COLOR_SCHEME.composition.stroke,
      },
      beforeinput: { 
        fill: options.colors?.beforeinput?.fill ?? DEFAULT_COLOR_SCHEME.beforeinput.fill,
        stroke: options.colors?.beforeinput?.stroke ?? DEFAULT_COLOR_SCHEME.beforeinput.stroke,
      },
      input: { 
        fill: options.colors?.input?.fill ?? DEFAULT_COLOR_SCHEME.input.fill,
        stroke: options.colors?.input?.stroke ?? DEFAULT_COLOR_SCHEME.input.stroke,
      },
      deleted: { 
        fill: options.colors?.deleted?.fill ?? DEFAULT_COLOR_SCHEME.deleted.fill,
        stroke: options.colors?.deleted?.stroke ?? DEFAULT_COLOR_SCHEME.deleted.stroke,
      },
      added: { 
        fill: options.colors?.added?.fill ?? DEFAULT_COLOR_SCHEME.added.fill,
        stroke: options.colors?.added?.stroke ?? DEFAULT_COLOR_SCHEME.added.stroke,
      },
    };

    this.options = {
      visualize: options.visualize ?? true,
      logEvents: options.logEvents ?? true,
      snapshots: options.snapshots ?? true,
      panel: options.panel ?? true,
      autoSnapshot: options.autoSnapshot ?? false,
      container: options.container,
      maxLogs: options.maxLogs ?? 1000,
      throttleSelection: options.throttleSelection ?? 100,
      colors,
      onError: options.onError,
    };

    // Create overlay element
    this.overlayEl = document.createElement('div');
    const overlayContainer = this.options.container || this.element;
    
    if (overlayContainer === this.element) {
      // Append to element itself (default behavior)
      Object.assign(this.overlayEl.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '1',
      });
      this.element.style.position = 'relative';
      this.element.appendChild(this.overlayEl);
    } else {
      // Append to custom container (e.g., document.body)
      Object.assign(this.overlayEl.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '999998', // Below floating panel
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
      });
      overlayContainer.appendChild(this.overlayEl);
    }

    // Initialize components
    if (this.options.visualize) {
      this.rangeVisualizer = new RangeVisualizer(this.element, this.overlayEl);
    }

    this.eventLogger = new EventLogger(this.options.maxLogs);
    this.snapshotManager = new SnapshotManager();

    if (this.options.panel) {
      // panel can be boolean or config object
      const panelConfig = typeof this.options.panel === 'boolean' 
        ? {} 
        : this.options.panel;
      this.floatingPanel = new FloatingPanel(panelConfig);
      this.setupFloatingPanelUpdates();
    }

    // Ensure all elements in the contenteditable area have IDs for tracking
    try {
      ensureSubtreeIds(this.element, 20);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'initialize.ensureIds');
    }

    this.attach();
    this.setupResizeObserver();
    this.setupScrollHandler();
  }

  /**
   * Handles errors with optional error callback
   */
  private handleError(error: Error, context: string): void {
    if (this.options.onError) {
      try {
        this.options.onError(error, context);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    } else {
      console.error(`ContentEditableVisualizer error [${context}]:`, error);
    }
  }

  /**
   * Sets up ResizeObserver to handle editor size changes
   */
  private setupResizeObserver(): void {
    try {
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          try {
            // Update visualization when editor size changes
            if (this.options.visualize && this.rangeVisualizer) {
              const selection = window.getSelection();
              const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
              if (range && this.element.contains(range.commonAncestorContainer)) {
                this.rangeVisualizer.drawRanges([{
                  range,
                  fill: this.options.colors.selection.fill,
                  stroke: this.options.colors.selection.stroke,
                  type: 'selection',
                }]);
              }
            }
          } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'resizeObserver');
          }
        });
        resizeObserver.observe(this.element);
        (this as any).resizeObserver = resizeObserver;
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'setupResizeObserver');
    }
  }

  /**
   * Sets up scroll handler to sync overlay position
   */
  private setupScrollHandler(): void {
    try {
      // Throttled scroll handler for performance
      this.scrollHandler = throttle(() => {
        try {
          if (this.options.visualize && this.rangeVisualizer) {
            const selection = window.getSelection();
            const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            if (range && this.element.contains(range.commonAncestorContainer)) {
              this.rangeVisualizer.drawRanges([{
                range,
                fill: this.options.colors.selection.fill,
                stroke: this.options.colors.selection.stroke,
                type: 'selection',
              }]);
            }
          }
        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error(String(error)), 'scrollHandler');
        }
      }, 50); // 50ms throttle for scroll events

      this.element.addEventListener('scroll', this.scrollHandler, { passive: true });
      // Also listen to window scroll if overlay is fixed
      if (this.options.container && this.options.container !== this.element) {
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'setupScrollHandler');
    }
  }

  /**
   * Attaches event listeners to the element
   */
  private attach(): void {
    if (this.isAttached) return;

    this.eventListeners.beforeinput = (e: Event) => {
      try {
        const event = e as InputEvent;
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (this.options.logEvents) {
          this.eventLogger.logEvent('beforeinput', event, range);
        }

        if (this.options.visualize && this.rangeVisualizer && range) {
          // Draw beforeinput range
          this.rangeVisualizer.drawRanges([{
            range,
            fill: this.options.colors.beforeinput.fill,
            stroke: this.options.colors.beforeinput.stroke,
            type: 'beforeinput',
          }]);

          // Draw target ranges if available
          try {
            const targetRanges = event.getTargetRanges?.();
            if (targetRanges && targetRanges.length > 0) {
              this.rangeVisualizer.drawTargetRanges(Array.from(targetRanges));
            }
          } catch (error) {
            // getTargetRanges not supported or error
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'beforeinput.getTargetRanges');
          }
        }

        // Capture beforeinput state
        try {
          this.beforeInputInfo = snapshotTextNodes(this.element);
          this.beforeInputDeletedRects = calculateDeletedRects(event, this.element);
        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error(String(error)), 'beforeinput.snapshot');
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'beforeinput');
      }
    };

    this.eventListeners.input = (e: Event) => {
      try {
        const event = e as InputEvent;
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (this.options.logEvents) {
          this.eventLogger.logEvent('input', event, range);
        }

        // Detect DOM changes
        let domChangeResult: DomChangeResult | undefined;
        try {
          if (this.beforeInputInfo) {
            domChangeResult = detectDomChanges(
              this.element,
              this.beforeInputInfo,
              this.beforeInputDeletedRects
            );
          }
        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error(String(error)), 'input.detectDomChanges');
        }

        if (this.options.visualize && this.rangeVisualizer && range) {
          // Draw input range
          this.rangeVisualizer.drawRanges([{
            range,
                fill: this.options.colors.input.fill,
                stroke: this.options.colors.input.stroke,
            type: 'input',
          }]);

          // Draw DOM change rects
          if (domChangeResult) {
            const rects: RectDrawInfo[] = [];
            domChangeResult.deletedRects.forEach(rect => {
              rects.push({
                rect,
                fill: this.options.colors.deleted.fill,
                stroke: this.options.colors.deleted.stroke,
                label: 'deleted',
              });
            });
            domChangeResult.addedRects.forEach(rect => {
              rects.push({
                rect,
                fill: this.options.colors.added.fill,
                stroke: this.options.colors.added.stroke,
                label: 'added',
              });
            });
            this.rangeVisualizer.drawRects(rects);
          }
        }

        // Auto-capture snapshot if enabled
        if (this.options.autoSnapshot && this.options.snapshots) {
          try {
            const logs = this.eventLogger.getLogs();
            const snapshot = this.snapshotManager.createSnapshot(
              this.element,
              logs,
              domChangeResult,
              'auto',
              `input: ${event.inputType}`
            );
            
            // Generate AI prompt
            try {
              const snapshotWithId = { ...snapshot, id: 0 }; // Temporary ID for prompt generation
              snapshot.aiPrompt = buildAiPrompt(snapshotWithId as Snapshot);
            } catch (error) {
              this.handleError(error instanceof Error ? error : new Error(String(error)), 'input.generatePrompt');
            }
            
            this.snapshotManager.saveSnapshot(snapshot).then(() => {
              this.updateFloatingPanel();
            }).catch((error) => {
              this.handleError(error instanceof Error ? error : new Error(String(error)), 'input.saveSnapshot');
            });
          } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'input.captureSnapshot');
          }
        }

        this.beforeInputInfo = null;
        this.beforeInputDeletedRects = [];
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'input');
      }
    };

    this.eventListeners.compositionstart = (e: Event) => {
      try {
        const event = e as CompositionEvent;
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (this.options.logEvents) {
          this.eventLogger.logEvent('compositionstart', event, range);
        }

        if (this.options.visualize && this.rangeVisualizer && range) {
          this.rangeVisualizer.drawRanges([{
            range,
            fill: this.options.colors.composition.fill,
            stroke: this.options.colors.composition.stroke,
            type: 'composition',
          }]);
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'compositionstart');
      }
    };

    this.eventListeners.compositionupdate = (e: Event) => {
      try {
        const event = e as CompositionEvent;
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (this.options.logEvents) {
          this.eventLogger.logEvent('compositionupdate', event, range);
        }

        if (this.options.visualize && this.rangeVisualizer && range) {
          this.rangeVisualizer.drawRanges([{
            range,
            fill: this.options.colors.composition.fill,
            stroke: this.options.colors.composition.stroke,
            type: 'composition',
          }]);
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'compositionupdate');
      }
    };

    this.eventListeners.compositionend = (e: Event) => {
      try {
        const event = e as CompositionEvent;
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (this.options.logEvents) {
          this.eventLogger.logEvent('compositionend', event, range);
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'compositionend');
      }
    };

    // Throttle selectionchange to avoid performance issues
    const handleSelectionChange = throttle(() => {
      try {
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (!range || !this.element.contains(range.commonAncestorContainer)) {
          // Clear visualization if selection is outside editor
          if (this.options.visualize && this.rangeVisualizer) {
            this.rangeVisualizer.drawRanges([]);
          }
          return;
        }

        if (this.options.logEvents) {
          this.eventLogger.logEvent('selectionchange', new Event('selectionchange'), range);
        }

        if (this.options.visualize && this.rangeVisualizer && range) {
          this.rangeVisualizer.drawRanges([{
            range,
            fill: this.options.colors.selection.fill,
            stroke: this.options.colors.selection.stroke,
            type: 'selection',
          }]);
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'selectionchange');
      }
    }, this.options.throttleSelection);

    this.eventListeners.selectionchange = handleSelectionChange;

    // Attach event listeners
    this.element.addEventListener('beforeinput', this.eventListeners.beforeinput);
    this.element.addEventListener('input', this.eventListeners.input);
    this.element.addEventListener('compositionstart', this.eventListeners.compositionstart);
    this.element.addEventListener('compositionupdate', this.eventListeners.compositionupdate);
    this.element.addEventListener('compositionend', this.eventListeners.compositionend);
    document.addEventListener('selectionchange', this.eventListeners.selectionchange);

    this.isAttached = true;
  }

  private setupFloatingPanelUpdates(): void {
    if (!this.floatingPanel) return;

    // Update events periodically
    const updateEvents = () => {
      if (this.floatingPanel) {
        this.floatingPanel.updateEvents(this.eventLogger.getLogs());
      }
    };

    // Update snapshots periodically
    const updateSnapshots = async () => {
      if (this.floatingPanel) {
        const snapshots = await this.snapshotManager.getAllSnapshots();
        this.floatingPanel.updateSnapshots(snapshots);
      }
    };

    // Initial update
    updateEvents();
    updateSnapshots();

    // Listen to new events
    this.eventLogger.onEvent(() => {
      updateEvents();
    });

    // Update snapshots every 2 seconds
    setInterval(updateSnapshots, 2000);
  }

  private updateFloatingPanel(): void {
    if (!this.floatingPanel) return;
    this.floatingPanel.updateEvents(this.eventLogger.getLogs());
    this.snapshotManager.getAllSnapshots().then(snapshots => {
      this.floatingPanel?.updateSnapshots(snapshots);
    });
  }

  // Public API

  /**
   * Gets all logged events
   * 
   * @returns Array of event logs
   */
  getEventLogs(): EventLog[] {
    try {
      return this.eventLogger.getLogs();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'getEventLogs');
      return [];
    }
  }

  /**
   * Clears all event logs
   */
  clearEventLogs(): void {
    try {
      this.eventLogger.clear();
      this.updateFloatingPanel();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'clearEventLogs');
    }
  }

  /**
   * Registers a callback for new events
   * 
   * @param callback - Function to call when a new event is logged
   * @returns Unsubscribe function
   */
  onEvent(callback: (log: EventLog) => void): () => void {
    try {
      return this.eventLogger.onEvent(callback);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'onEvent');
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Manually captures a snapshot
   * 
   * @param trigger - Optional trigger type for the snapshot
   * @param triggerDetail - Optional detail about what triggered the snapshot
   * @returns Promise that resolves to the snapshot ID
   * @throws {Error} If snapshots are not enabled
   */
  async captureSnapshot(trigger?: SnapshotTrigger, triggerDetail?: string): Promise<number> {
    try {
      if (!this.options.snapshots) {
        throw new Error('Snapshots are not enabled');
      }

      const logs = this.eventLogger.getLogs();
      const snapshot = this.snapshotManager.createSnapshot(
        this.element,
        logs,
        undefined,
        trigger || 'manual',
        triggerDetail
      );
      
      // Generate AI prompt
      try {
        const snapshotWithId = { ...snapshot, id: 0 }; // Temporary ID for prompt generation
        snapshot.aiPrompt = buildAiPrompt(snapshotWithId as Snapshot);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'captureSnapshot.generatePrompt');
      }
      
      const id = await this.snapshotManager.saveSnapshot(snapshot);
      this.updateFloatingPanel();
      return id;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'captureSnapshot');
      throw err;
    }
  }

  /**
   * Gets all stored snapshots
   * 
   * @returns Promise that resolves to an array of snapshots
   */
  async getSnapshots(): Promise<Snapshot[]> {
    try {
      return await this.snapshotManager.getAllSnapshots();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'getSnapshots');
      return [];
    }
  }

  /**
   * Deletes a snapshot by ID
   * 
   * @param id - The snapshot ID to delete
   */
  async deleteSnapshot(id: number): Promise<void> {
    try {
      await this.snapshotManager.deleteSnapshot(id);
      this.updateFloatingPanel();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'deleteSnapshot');
      throw err;
    }
  }

  /**
   * Clears all snapshots
   */
  async clearSnapshots(): Promise<void> {
    try {
      await this.snapshotManager.clearAllSnapshots();
      this.updateFloatingPanel();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'clearSnapshots');
      throw err;
    }
  }

  /**
   * Enables or disables visualization
   * 
   * @param enabled - Whether to enable visualization
   */
  showVisualization(enabled: boolean): void {
    try {
      if (enabled && !this.rangeVisualizer) {
        this.rangeVisualizer = new RangeVisualizer(this.element, this.overlayEl);
      } else if (!enabled && this.rangeVisualizer) {
        this.rangeVisualizer.clear();
        this.rangeVisualizer.destroy();
        this.rangeVisualizer = null;
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'showVisualization');
    }
  }

  /**
   * Exports all events and snapshots as JSON
   * 
   * @returns Promise that resolves to export data
   */
  async exportData(): Promise<ExportData> {
    try {
      const snapshots = await this.snapshotManager.getAllSnapshots();
      return {
        events: this.eventLogger.getSerializedLogs(),
        snapshots,
        environment: snapshots[0]?.environment || {
          os: 'Unknown',
          osVersion: '',
          browser: 'Unknown',
          browserVersion: '',
          device: 'Unknown',
          isMobile: false,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'exportData');
      throw err;
    }
  }

  /**
   * Detaches event listeners and cleans up resources
   */
  detach(): void {
    if (!this.isAttached) return;

    try {
      this.element.removeEventListener('beforeinput', this.eventListeners.beforeinput);
      this.element.removeEventListener('input', this.eventListeners.input);
      this.element.removeEventListener('compositionstart', this.eventListeners.compositionstart);
      this.element.removeEventListener('compositionupdate', this.eventListeners.compositionupdate);
      this.element.removeEventListener('compositionend', this.eventListeners.compositionend);
      document.removeEventListener('selectionchange', this.eventListeners.selectionchange);

      // Remove scroll handlers
      if (this.scrollHandler) {
        this.element.removeEventListener('scroll', this.scrollHandler);
        if (this.options.container && this.options.container !== this.element) {
          window.removeEventListener('scroll', this.scrollHandler);
        }
        this.scrollHandler = null;
      }

      // Clean up ResizeObserver
      const resizeObserver = (this as any).resizeObserver;
      if (resizeObserver) {
        resizeObserver.disconnect();
        delete (this as any).resizeObserver;
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'detach');
    }

    if (this.rangeVisualizer) {
      this.rangeVisualizer.destroy();
      this.rangeVisualizer = null;
    }

    if (this.floatingPanel) {
      this.floatingPanel.destroy();
      this.floatingPanel = null;
    }

    this.overlayEl.remove();
    this.isAttached = false;
  }

  /**
   * Completely removes the visualizer and all UI elements
   */
  destroy(): void {
    try {
      this.detach();

      if (this.rangeVisualizer) {
        this.rangeVisualizer.destroy();
        this.rangeVisualizer = null;
      }

      if (this.floatingPanel) {
        this.floatingPanel.destroy();
        this.floatingPanel = null;
      }

      if (this.overlayEl && this.overlayEl.parentNode) {
        this.overlayEl.remove();
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'destroy');
    }
  }
}

/**
 * Convenience function to create a visualizer instance
 * 
 * @param element - The contenteditable element to attach the visualizer to
 * @param options - Configuration options
 * @returns A new ContentEditableVisualizer instance
 * 
 * @example
 * ```typescript
 * const visualizer = createVisualizer(editorElement, {
 *   visualize: true,
 *   colors: {
 *     selection: { fill: 'rgba(255, 0, 0, 0.2)', stroke: 'rgba(255, 0, 0, 0.8)' }
 *   }
 * });
 * ```
 */
export function createVisualizer(
  element: HTMLElement,
  options?: ContentEditableVisualizerOptions
): ContentEditableVisualizer {
  return new ContentEditableVisualizer(element, options);
}

// Export types
export type { 
  EventLog, 
  RangeDrawInfo, 
  RectDrawInfo, 
  Snapshot, 
  SnapshotTrigger, 
  FloatingPanelOptions,
  ContentEditableVisualizerOptions,
  VisualizerColorScheme,
  FloatingPanelConfig,
};
export type { FloatingPanelPosition, FloatingPanelTheme } from './types';

