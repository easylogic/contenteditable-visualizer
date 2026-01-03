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
     * Track document changes
     */
    trackDocument?: boolean;
    
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
  /** 관련 contenteditable 이벤트 ID (선택적) */
  relatedEventId?: number;
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
      // Capture operation if available
      // Slate.js onChange receives { operation?: Operation } - single operation only
      if (this.options.config?.trackOperations && options?.operation) {
        this.captureOperations([options.operation]);
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
    this.slateEditor = null;
  }

  /**
   * Capture Slate operations
   */
  private captureOperations(operations: any[]): void {
    operations.forEach((operation) => {
      const operationData: Omit<OperationData, 'timestamp' | 'relatedEventId'> = {
        type: operation.type,
        path: operation.path,
        properties: operation.properties,
        newProperties: operation.newProperties,
        node: operation.node,
        offset: operation.offset,
        text: operation.text,
      };

      // Use BasePlugin's addEditorEvent for consistent event storage
      this.addEditorEvent('operation', operationData);
    });
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
        operationCount: this.editorEvents.length,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get operation history
   * Returns events in OperationData format with timestamp and relatedEventId
   */
  getEvents(): OperationData[] {
    return this.editorEvents.map(event => ({
      timestamp: event.timestamp,
      relatedEventId: event.relatedEventId,
      ...event.data as Omit<OperationData, 'timestamp' | 'relatedEventId'>,
    }));
  }

  /**
   * Get document structure as serializable data
   * Returns Slate document structure as JSON for StructureRenderer
   */
  getStructureData(): any {
    if (!this.slateEditor) return null;

    const config = this.options.config || {};
    if (!config.trackDocument) return null;

    try {
      return this.childrenToStructureNodes(this.slateEditor.children);
    } catch (error) {
      console.warn('SlatePlugin: Failed to get structure data', error);
      return null;
    }
  }

  /**
   * Convert Slate children to structure nodes
   */
  private childrenToStructureNodes(children: any[]): any[] {
    return children.map(node => {
      const nodeType = node.type || 'unknown';
      const structureNode: any = {
        type: nodeType,
      };

      // Add properties if present
      if (node.properties && Object.keys(node.properties).length > 0) {
        structureNode.attrs = node.properties;
      }

      // Add text content if it's a text node
      if (node.text !== undefined) {
        structureNode.text = String(node.text);
      }

      // Recursively add children
      if (Array.isArray(node.children) && node.children.length > 0) {
        structureNode.children = this.childrenToStructureNodes(node.children);
      }

      return structureNode;
    });
  }

}

