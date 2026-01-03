/**
 * Lexical plugin for contenteditable-visualizer
 */

import { BasePlugin, type PluginEvent } from 'contenteditable-visualizer';
import type { PluginMetadata, PluginOptions } from 'contenteditable-visualizer';
import type { LexicalEditor, EditorState, EditorUpdate } from 'lexical';

/**
 * Lexical plugin options
 */
export interface LexicalPluginOptions extends PluginOptions {
  config?: {
    /**
     * Track editor updates
     */
    trackUpdates?: boolean;
    
    /**
     * Track selection changes
     */
    trackSelection?: boolean;
    
    /**
     * Track document changes
     */
    trackDocument?: boolean;
    
    /**
     * Track command execution
     */
    trackCommands?: boolean;
    
    /**
     * Track history state (undo/redo)
     */
    trackHistory?: boolean;
    
    /**
     * Track text formatting changes (bold, italic, underline, etc.)
     */
    trackFormatting?: boolean;
    
    /**
     * Maximum number of updates to keep in history
     */
    maxUpdateHistory?: number;
  };
}

/**
 * Update data captured by the plugin
 */
export interface UpdateData {
  timestamp: number;
  /** 관련 contenteditable 이벤트 ID (선택적) */
  relatedEventId?: number;
  tags?: Set<string>;
  prevEditorState?: {
    readOnly?: boolean;
  };
  editorState?: {
    readOnly?: boolean;
  };
  dirtyElements?: Map<string, boolean>;
  dirtyLeaves?: Set<string>;
}

/**
 * Command data captured by the plugin
 */
export interface CommandData {
  timestamp: number;
  relatedEventId?: number;
  commandType: string;
  payload?: any;
}

/**
 * Formatting change data captured by the plugin
 */
export interface FormattingChangeData {
  timestamp: number;
  relatedEventId?: number;
  type: 'add' | 'remove' | 'update';
  formatFlags: number; // Lexical format flags (bitmask)
  formatNames: string[]; // Human-readable format names (bold, italic, underline, etc.)
  nodeKey?: string; // TextNode key if available
  position?: {
    anchor?: any;
    focus?: any;
  };
}

/**
 * Lexical plugin metadata
 */
const LEXICAL_PLUGIN_METADATA: PluginMetadata = {
  id: 'lexical',
  name: 'Lexical Plugin',
  version: '0.1.0',
  editor: 'lexical',
  description: 'Monitors Lexical editor updates, commands, and state changes',
};

/**
 * Lexical plugin for monitoring editor state
 */
export class LexicalPlugin extends BasePlugin {
  readonly metadata = LEXICAL_PLUGIN_METADATA;
  
  private lexicalEditor: LexicalEditor | null = null;
  private updateListenerUnregister?: () => void;
  private commandListeners: Map<string, () => void> = new Map();
  private previousFormatting: Map<string, number> = new Map(); // nodeKey -> format flags

  constructor(options: LexicalPluginOptions = {}) {
    super(options);
  }

  protected onInitialize(): void {
    this.lexicalEditor = this.editor as LexicalEditor;
    
    if (!this.lexicalEditor) {
      throw new Error('LexicalPlugin: Invalid LexicalEditor instance');
    }

    // Validate LexicalEditor has required methods
    if (
      typeof this.lexicalEditor.registerUpdateListener !== 'function' ||
      typeof this.lexicalEditor.getEditorState !== 'function'
    ) {
      throw new Error('LexicalPlugin: Invalid LexicalEditor instance - missing required methods');
    }
  }

  protected onAttach(): void {
    this.lexicalEditor = this.editor as LexicalEditor;
    
    if (!this.lexicalEditor) {
      throw new Error('LexicalPlugin: Invalid LexicalEditor instance');
    }

    // Validate LexicalEditor has required methods
    if (
      typeof this.lexicalEditor.registerUpdateListener !== 'function' ||
      typeof this.lexicalEditor.getEditorState !== 'function'
    ) {
      throw new Error('LexicalPlugin: Invalid LexicalEditor instance - missing required methods');
    }

    const config = this.options.config || {};

    // Register update listener
    if (config.trackUpdates !== false) {
      this.updateListenerUnregister = this.lexicalEditor.registerUpdateListener(
        (editorState: EditorState, editor: LexicalEditor, tags: Set<string>) => {
          this.captureUpdate(editorState, editor, tags);
        }
      );
    }
  }

  protected onDetach(): void {
    // Unregister update listener
    if (this.updateListenerUnregister) {
      this.updateListenerUnregister();
      this.updateListenerUnregister = undefined;
    }

    // Unregister all command listeners
    this.commandListeners.forEach((unregister) => {
      unregister();
    });
    this.commandListeners.clear();
  }

  protected onDestroy(): void {
    this.onDetach();
    this.lexicalEditor = null;
  }

  /**
   * Capture Lexical editor update
   */
  private captureUpdate(
    editorState: EditorState,
    editor: LexicalEditor,
    tags: Set<string>
  ): void {
    const config = this.options.config || {};

    try {
      const updateData: Omit<UpdateData, 'timestamp' | 'relatedEventId'> = {
        tags: tags,
        editorState: {
          readOnly: editorState.readOnly,
        },
      };

      // Capture update event
      if (config.trackUpdates !== false) {
        this.addEditorEvent('update', updateData);
      }

      // Capture selection changes
      if (config.trackSelection) {
        this.captureSelection(editorState);
      }

      // Capture document changes
      if (config.trackDocument) {
        this.captureDocument(editorState);
      }

      // Capture history state
      if (config.trackHistory) {
        this.captureHistory(editorState, tags);
      }

      // Capture formatting changes
      if (config.trackFormatting) {
        this.captureFormatting(editorState);
      }
    } catch (error) {
      // Silently handle errors to avoid breaking editor functionality
      console.warn('LexicalPlugin: Error capturing update', error);
    }
  }

  /**
   * Capture selection state
   */
  private captureSelection(editorState: EditorState): void {
    try {
      editorState.read(() => {
        const selection = editorState._selection;
        if (selection) {
          const selectionData = {
            type: selection.constructor.name,
            anchor: selection.anchor,
            focus: selection.focus,
            isCollapsed: selection.isCollapsed(),
          };

          this.addEditorEvent('selectionChange', selectionData);
        }
      });
    } catch (error) {
      // Selection may not be available in read context
    }
  }

  /**
   * Capture document state
   */
  private captureDocument(editorState: EditorState): void {
    try {
      editorState.read(() => {
        const nodeMap = (editorState as any)._nodeMap;
        if (nodeMap) {
          const root = nodeMap.get('root');
          // Capture minimal document structure
          const documentData = {
            nodeCount: nodeMap.size || 0,
            hasRoot: !!root,
          };

          this.addEditorEvent('documentChange', documentData);
        }
      });
    } catch (error) {
      // Document may not be available in read context
    }
  }

  /**
   * Capture history state
   */
  private captureHistory(editorState: EditorState, tags: Set<string>): void {
    if (tags.has('undo') || tags.has('redo')) {
      const historyData = {
        type: tags.has('undo') ? 'undo' : 'redo',
      };

      this.addEditorEvent('history', historyData);
    }
  }

  /**
   * Capture formatting changes
   * Lexical uses format flags (bitmask) on TextNode for formatting (bold, italic, underline, etc.)
   */
  private captureFormatting(editorState: EditorState): void {
    try {
      editorState.read(() => {
        const nodeMap = (editorState as any)._nodeMap;
        if (!nodeMap) return;

        const currentFormatting = new Map<string, number>();

        // Iterate through all nodes to find TextNodes with formatting
        nodeMap.forEach((node: any, key: string) => {
          // Check if node is a TextNode (has format property)
          if (node && typeof node.getFormat === 'function') {
            try {
              const formatFlags = node.getFormat();
              if (formatFlags !== undefined && formatFlags !== null) {
                currentFormatting.set(key, formatFlags);
                
                // Check if format changed
                const previousFormat = this.previousFormatting.get(key);
                if (previousFormat !== undefined && previousFormat !== formatFlags) {
                  // Format changed
                  const formatNames = this.getFormatNames(formatFlags);
                  const prevFormatNames = this.getFormatNames(previousFormat);
                  
                  // Determine change type
                  let changeType: 'add' | 'remove' | 'update' = 'update';
                  if (previousFormat === 0) {
                    changeType = 'add';
                  } else if (formatFlags === 0) {
                    changeType = 'remove';
                  }

                  const formattingData: Omit<FormattingChangeData, 'timestamp' | 'relatedEventId'> = {
                    type: changeType,
                    formatFlags,
                    formatNames,
                    nodeKey: key,
                  };

                  // Try to get selection position if available
                  const selection = (editorState as any)._selection;
                  if (selection) {
                    const position: any = {};
                    if (selection.anchor !== undefined) {
                      position.anchor = selection.anchor;
                    }
                    if (selection.focus !== undefined) {
                      position.focus = selection.focus;
                    }
                    if (Object.keys(position).length > 0) {
                      formattingData.position = position;
                    }
                  }

                  this.addEditorEvent('formattingChange', formattingData);
                } else if (previousFormat === undefined && formatFlags !== 0) {
                  // New node with formatting
                  const formatNames = this.getFormatNames(formatFlags);
                  const formattingData: Omit<FormattingChangeData, 'timestamp' | 'relatedEventId'> = {
                    type: 'add',
                    formatFlags,
                    formatNames,
                    nodeKey: key,
                  };

                  this.addEditorEvent('formattingChange', formattingData);
                }
              }
            } catch (e) {
              // Node might not be a TextNode or getFormat might not exist
            }
          }
        });

        // Update previous formatting state
        this.previousFormatting = currentFormatting;
      });
    } catch (error) {
      // Formatting tracking may fail silently
    }
  }

  /**
   * Convert format flags to human-readable format names
   * Lexical format flags are bitmasks:
   * - 1 = bold
   * - 2 = italic
   * - 4 = underline
   * - 8 = strikethrough
   * - 16 = code
   * - 32 = subscript
   * - 64 = superscript
   */
  private getFormatNames(formatFlags: number): string[] {
    const names: string[] = [];
    
    // Common Lexical format flags (these may vary by version)
    if (formatFlags & 1) names.push('bold');
    if (formatFlags & 2) names.push('italic');
    if (formatFlags & 4) names.push('underline');
    if (formatFlags & 8) names.push('strikethrough');
    if (formatFlags & 16) names.push('code');
    if (formatFlags & 32) names.push('subscript');
    if (formatFlags & 64) names.push('superscript');
    
    return names;
  }

  /**
   * Register a command listener
   * This should be called by application code to track specific commands
   */
  public registerCommandListener(
    commandType: string,
    handler: (payload?: any) => boolean
  ): () => void {
    if (!this.lexicalEditor) {
      return () => {};
    }

    const config = this.options.config || {};
    if (!config.trackCommands) {
      // If command tracking is disabled, just register the command without tracking
      return this.lexicalEditor.registerCommand(
        commandType as any,
        handler,
        0
      );
    }

    // Wrap handler to capture command execution
    const wrappedHandler = (payload?: any) => {
      const result = handler(payload);
      
      const commandData: Omit<CommandData, 'timestamp' | 'relatedEventId'> = {
        commandType,
        payload,
      };

      this.addEditorEvent('command', commandData);
      
      return result;
    };

    const unregister = this.lexicalEditor.registerCommand(
      commandType as any,
      wrappedHandler,
      0
    );

    this.commandListeners.set(commandType, unregister);
    return unregister;
  }

  /**
   * Get current Lexical editor state
   */
  getState(): any {
    if (!this.lexicalEditor) return null;

    const config = this.options.config || {};

    try {
      const editorState = this.lexicalEditor.getEditorState();
      
      const state: any = {
        updateCount: this.editorEvents.filter(e => e.type === 'update').length,
      };

      if (config.trackSelection) {
        try {
          editorState.read(() => {
            const selection = (editorState as any)._selection;
            if (selection) {
              const selectionInfo: any = {
                type: selection.constructor?.name || 'Unknown',
                isCollapsed: typeof selection.isCollapsed === 'function' ? selection.isCollapsed() : false,
              };

              // Only include anchor/focus if they exist
              if (selection.anchor !== undefined) {
                selectionInfo.anchor = selection.anchor;
              }
              if (selection.focus !== undefined) {
                selectionInfo.focus = selection.focus;
              }

              state.selection = selectionInfo;
            } else {
              state.selection = null;
            }
          });
        } catch (error) {
          state.selection = null;
        }
      }

      if (config.trackDocument) {
        try {
          editorState.read(() => {
            const nodeMap = (editorState as any)._nodeMap;
            state.document = {
              nodeCount: nodeMap?.size || 0,
              hasRoot: !!(nodeMap?.get('root')),
            };
          });
        } catch (error) {
          state.document = {
            nodeCount: 0,
            hasRoot: false,
          };
        }
      }

      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get update history
   * Returns events in UpdateData format with timestamp and relatedEventId
   */
  getEvents(): PluginEvent[] {
    return this.editorEvents.slice();
  }

  /**
   * Get document structure as serializable data
   * Returns Lexical document structure as JSON for StructureRenderer
   */
  getStructureData(): any {
    if (!this.lexicalEditor) return null;

    const config = this.options.config || {};
    if (!config.trackDocument) return null;

    try {
      const editorState = this.lexicalEditor.getEditorState();
      let structure: any = null;
      
      editorState.read(() => {
        const nodeMap = (editorState as any)._nodeMap;
        if (nodeMap) {
          const root = nodeMap.get('root');
          if (root) {
            structure = this.nodeToStructureNode(root);
          }
        }
      });
      
      return structure;
    } catch (error) {
      console.warn('LexicalPlugin: Failed to get structure data', error);
      return null;
    }
  }

  /**
   * Convert Lexical node to structure node
   */
  private nodeToStructureNode(node: any): any {
    const nodeType = node.getType?.() || node.constructor?.name || 'unknown';
    const nodeKey = node.getKey?.() || node.__key || undefined;
    
    const structureNode: any = {
      type: nodeType,
    };

    if (nodeKey) {
      structureNode.key = nodeKey;
    }

    // Add format if it's a text node
    if (typeof node.getFormat === 'function') {
      const formatFlags = node.getFormat();
      if (formatFlags !== 0) {
        const formatNames = this.getFormatNames(formatFlags);
        structureNode.attrs = { format: formatNames };
      }
    }

    // Add text content if it's a text node
    if (typeof node.getTextContent === 'function') {
      const textContent = node.getTextContent();
      if (textContent) {
        structureNode.text = textContent;
      }
    }

    // Recursively add children
    if (typeof node.getChildren === 'function') {
      try {
        const children = node.getChildren();
        if (Array.isArray(children) && children.length > 0) {
          structureNode.children = children.map((child: any) => 
            this.nodeToStructureNode(child)
          );
        }
      } catch {
        // Ignore if getChildren fails
      }
    }

    return structureNode;
  }

}
