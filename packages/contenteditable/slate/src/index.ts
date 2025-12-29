/**
 * Slate.js plugin for contenteditable-visualizer
 */

import { BasePlugin } from 'contenteditable-visualizer';
import type { PluginMetadata, PluginOptions } from 'contenteditable-visualizer';
import type { Editor } from 'slate';

/**
 * Slate plugin options
 */
export interface SlatePluginOptions extends PluginOptions {
  config?: {
    /**
     * Track operations
     */
    trackOperations?: boolean;
    
    /**
     * Track selection changes
     */
    trackSelection?: boolean;
    
    /**
     * Track history (undo/redo)
     */
    trackHistory?: boolean;
    
    /**
     * Maximum number of operations to keep in history
     */
    maxOperationHistory?: number;
  };
}

/**
 * Operation data captured by the plugin
 */
export interface OperationData {
  timestamp: number;
  type: string;
  path?: number[];
  properties?: any;
  newProperties?: any;
  node?: any;
  offset?: number;
  text?: string;
}

/**
 * Slate plugin metadata
 */
const SLATE_PLUGIN_METADATA: PluginMetadata = {
  id: 'slate',
  name: 'Slate.js Plugin',
  version: '0.1.0',
  editor: 'slate',
  description: 'Monitors Slate.js operations, editor changes, and selection',
};

/**
 * Slate.js plugin for monitoring editor state
 */
export class SlatePlugin extends BasePlugin {
  readonly metadata = SLATE_PLUGIN_METADATA;
  
  private slateEditor: Editor | null = null;
  private operationHistory: OperationData[] = [];
  private onChangeHandler?: (options?: any) => void;
  private originalOnChange?: (options?: any) => void;

  constructor(options: SlatePluginOptions = {}) {
    super(options);
  }

  protected onInitialize(): void {
    this.slateEditor = this.editor as Editor;
    
    if (!this.slateEditor || typeof this.slateEditor.onChange !== 'function') {
      throw new Error('SlatePlugin: Invalid Editor instance');
    }
  }

  protected onAttach(): void {
    if (!this.slateEditor) return;

    // Wrap onChange to capture operations
    this.originalOnChange = this.slateEditor.onChange;
    
    this.onChangeHandler = (options?: any) => {
      // Capture operations if available
      if (options?.operations && this.options.config?.trackOperations) {
        this.captureOperations(options.operations);
      }
      
      // Call original onChange
      if (this.originalOnChange) {
        this.originalOnChange(options);
      }
    };
    
    this.slateEditor.onChange = this.onChangeHandler;
  }

  protected onDetach(): void {
    if (this.slateEditor && this.originalOnChange) {
      this.slateEditor.onChange = this.originalOnChange;
    }
    this.onChangeHandler = undefined;
    this.originalOnChange = undefined;
  }

  protected onDestroy(): void {
    this.onDetach();
    this.operationHistory = [];
    this.slateEditor = null;
  }

  /**
   * Capture Slate operations
   */
  private captureOperations(operations: any[]): void {
    operations.forEach((operation) => {
      const operationData: OperationData = {
        timestamp: Date.now(),
        type: operation.type,
        path: operation.path,
        properties: operation.properties,
        newProperties: operation.newProperties,
        node: operation.node,
        offset: operation.offset,
        text: operation.text,
      };

      this.operationHistory.push(operationData);
    });
    
    // Keep only last N operations
    const maxHistory = this.options.config?.maxOperationHistory ?? 100;
    if (this.operationHistory.length > maxHistory) {
      this.operationHistory.shift();
    }
  }

  /**
   * Get current Slate editor state
   */
  getState(): any {
    if (!this.slateEditor) return null;

    const config = this.options.config || {};

    try {
      return {
        children: config.trackDocument ? this.slateEditor.children : undefined,
        selection: config.trackSelection ? this.slateEditor.selection : undefined,
        operationCount: this.operationHistory.length,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get operation history
   */
  getEvents(): OperationData[] {
    return this.operationHistory.slice();
  }
}

