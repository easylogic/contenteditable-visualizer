/**
 * ProseMirror plugin for contenteditable-visualizer
 */

import { BasePlugin, type PluginEvent } from 'contenteditable-visualizer';
import type { PluginEvents, PluginMetadata, PluginOptions } from 'contenteditable-visualizer';
import type { EditorView } from 'prosemirror-view';

/**
 * ProseMirror plugin options
 */
export interface ProseMirrorPluginOptions extends PluginOptions {
  config?: {
    /**
     * Track transaction steps
     */
    trackSteps?: boolean;
    
    /**
     * Track selection changes
     */
    trackSelection?: boolean;
    
    /**
     * Track document changes
     */
    trackDocument?: boolean;
    
    /**
     * Track view updates
     */
    trackViewUpdates?: boolean;
    
    /**
     * Track focus/blur events
     */
    trackFocus?: boolean;
    
    /**
     * Track plugin state changes
     */
    trackPluginStates?: boolean;
    
    /**
     * Track mark changes
     */
    trackMarks?: boolean;
    
    /**
     * Track command execution
     */
    trackCommands?: boolean;
    
    /**
     * Track history state (undo/redo)
     */
    trackHistory?: boolean;
    
    /**
     * Maximum number of transactions to keep in history
     */
    maxTransactionHistory?: number;
  };
}

/**
 * Transaction data captured by the plugin
 */
export interface TransactionData {
  timestamp: number;
  /** 관련 contenteditable 이벤트 ID (선택적) */
  relatedEventId?: number;
  steps: Array<{
    stepType: string;
    from: number;
    to: number;
    slice?: any;
  }>;
  time?: number;
  storedMarks?: any;
  meta?: Record<string, any>;
  docChanged: boolean;
  selectionChanged: boolean;
}

/**
 * View update data
 */
export interface ViewUpdateData {
  timestamp: number;
  relatedEventId?: number;
  prevState?: {
    docSize: number;
    selection: {
      from: number;
      to: number;
      anchor: number;
      head: number;
    };
  };
  newState?: {
    docSize: number;
    selection: {
      from: number;
      to: number;
      anchor: number;
      head: number;
    };
  };
  docChanged: boolean;
  selectionChanged: boolean;
  tr?: {
    steps: number;
    time?: number;
    storedMarks?: any;
    meta?: Record<string, any>;
  };
}

/**
 * Selection change data
 */
export interface SelectionChangeData {
  timestamp: number;
  relatedEventId?: number;
  from: number;
  to: number;
  anchor: number;
  head: number;
  empty: boolean;
  storedMarks?: any;
  selectionType?: string;
}

/**
 * Focus/Blur event data
 */
export interface FocusEventData {
  timestamp: number;
  relatedEventId?: number;
  type: 'focus' | 'blur';
  hasSelection: boolean;
  selection?: {
    from: number;
    to: number;
  };
}

/**
 * Plugin state change data
 */
export interface PluginStateChangeData {
  timestamp: number;
  relatedEventId?: number;
  pluginKey: string;
  prevState?: any;
  newState?: any;
  changed: boolean;
}

/**
 * Mark change data
 */
export interface MarkChangeData {
  timestamp: number;
  relatedEventId?: number;
  type: 'add' | 'remove' | 'update';
  marks: any[];
  position?: {
    from: number;
    to: number;
  };
}

/**
 * Command execution data
 */
export interface CommandData {
  timestamp: number;
  relatedEventId?: number;
  commandName: string;
  args?: any[];
  success: boolean;
  transaction?: {
    steps: number;
    docChanged: boolean;
    selectionChanged: boolean;
  };
}

/**
 * History state data
 */
export interface HistoryStateData {
  timestamp: number;
  relatedEventId?: number;
  type: 'undo' | 'redo' | 'clear';
  canUndo: boolean;
  canRedo: boolean;
  undoDepth?: number;
  redoDepth?: number;
}

/**
 * ProseMirror plugin metadata
 */
const PROSEMIRROR_PLUGIN_METADATA: PluginMetadata = {
  id: 'prosemirror',
  name: 'ProseMirror Plugin',
  version: '0.1.0',
  editor: 'prosemirror',
  description: 'Monitors ProseMirror transactions, state changes, and selection',
};

/**
 * ProseMirror plugin for monitoring editor state
 * 
 * This plugin requires an EditorView instance to be passed via registerPlugin().
 * The EditorView instance is injected from outside (user's application code),
 * and this plugin wraps its methods to monitor transactions and state changes.
 * 
 * @example
 * ```typescript
 * const view = new EditorView(dom, { state });
 * const plugin = new ProseMirrorPlugin({ config: { ... } });
 * visualizer.registerPlugin(plugin, view); // EditorView instance is injected here
 * ```
 */
export class ProseMirrorPlugin extends BasePlugin {
  readonly metadata = PROSEMIRROR_PLUGIN_METADATA;
  
  /**
   * The ProseMirror EditorView instance injected via registerPlugin().
   * 
   * This is the main entry point for monitoring ProseMirror:
   * - view.state: EditorState (document, selection, plugins)
   * - view.state.schema: Schema (node types, mark types)
   * - view.state.plugins: All registered ProseMirror plugins
   * - view.dispatchTransaction: Method to wrap for transaction monitoring
   * - view.props.update: Method to wrap for view update monitoring
   * - view.dom: DOM element for focus/blur events
   * 
   * EditorView provides access to everything needed for monitoring,
   * so we only need to store this single instance.
   */
  private view: EditorView | null = null;
  
  private originalDispatchTransaction?: (tr: any) => void;
  private originalUpdate?: (view: EditorView, prevState: any) => void;
  private unsubscribe?: () => void;
  private previousSelection: any = null;
  private focusHandler?: () => void;
  private blurHandler?: () => void;
  private previousPluginStates: Map<string, any> = new Map();

  constructor(options: ProseMirrorPluginOptions = {}) {
    super(options);
  }

  protected onInitialize(): void {
    // BasePlugin.initialize() sets this.editor from registerPlugin(plugin, editor)
    // We extract and validate the EditorView instance here
    if (!this.editor) {
      throw new Error(
        'ProseMirrorPlugin: EditorView instance not injected. ' +
        'Make sure to call visualizer.registerPlugin(plugin, view) with a ProseMirror EditorView instance.'
      );
    }
    
    const view = this.editor as EditorView;
    // EditorView validation: check for essential properties
    // EditorView has 'state', 'dom', and 'dispatch' methods
    // dispatchTransaction might be in props or as a method
    if (!view || 
        !view.state || 
        !view.dom || 
        typeof (view as any).dispatch !== 'function') {
      throw new Error(
        'ProseMirrorPlugin: Invalid EditorView instance. ' +
        'Expected a ProseMirror EditorView instance. ' +
        'The second argument to registerPlugin() must be an EditorView instance.'
      );
    }
    
    // Store the EditorView instance for this plugin
    // EditorView provides access to all ProseMirror internals:
    // - view.state: EditorState (document, selection, plugins)
    // - view.state.schema: Schema
    // - view.state.plugins: All plugins
    // - view.dispatchTransaction: Transaction handler
    // - view.props.update: Update handler
    // - view.dom: DOM element
    this.view = view;
  }

  protected onAttach(): void {
    if (!this.view) {
      throw new Error('ProseMirrorPlugin: Cannot attach - EditorView instance not initialized. Call registerPlugin() first.');
    }

    const config = this.options.config || {};
    // Access the stored EditorView instance
    const view = this.view as any;
    
    // Store initial selection from the injected EditorView
    this.previousSelection = view.state.selection;

    // Wrap dispatch method to capture transactions
    // ProseMirror's EditorView uses 'dispatch' method to handle transactions
    // We wrap this method to intercept all transactions
    const originalDispatch = (view as any).dispatch;
    if (typeof originalDispatch === 'function') {
      // Save original dispatch method
      this.originalDispatchTransaction = originalDispatch.bind(view);
      
      // Replace with wrapped version that captures transactions
      (view as any).dispatch = (transaction: any) => {
        // Store previous state before transaction is applied
        // This is needed for view update tracking (if props.update wrapping fails)
        const prevStateBeforeTransaction = this.view?.state;
        
        // Capture transaction before dispatching
        // This captures the transaction data, but state hasn't changed yet
        this.captureTransaction(transaction);
        
        // Call original dispatch on the injected EditorView
        // This will apply the transaction and update the state
        // ProseMirror will then call props.update if it's set
        this.originalDispatchTransaction!(transaction);
        
        // After transaction is applied, capture view update if enabled
        // BUT only if props.update is NOT wrapped (to avoid duplicate tracking)
        // If props.update is wrapped, it will handle view update tracking
        const config = this.options.config || {};
        if (config.trackViewUpdates && this.view && prevStateBeforeTransaction && !this.originalUpdate) {
          // props.update is not wrapped, so we track here
          // Capture the view update with correct prevState and newState
          this.captureViewUpdateInternal(this.view, prevStateBeforeTransaction);
        }
      };
    } else {
      console.warn('ProseMirrorPlugin: dispatch method not found on EditorView. Transaction tracking may not work.');
    }

    // Capture view updates if enabled
    // Note: ProseMirror's EditorView calls props.update internally after state changes
    // We need to wrap it, but be careful - props might be read-only or copied internally
    if (config.trackViewUpdates) {
      // ProseMirror stores props internally, so we need to check if we can modify it
      // The update function is called by ProseMirror internally, so we wrap it
      if (view.props) {
        // Try to get the original update function
        const originalUpdate = view.props.update;
        
        if (typeof originalUpdate === 'function') {
          // Save original update function
          this.originalUpdate = originalUpdate;
          
          // Replace with wrapped version
          // Note: This might not work if ProseMirror has already copied props internally
          // In that case, we'll need to track updates through transaction monitoring instead
          try {
            view.props.update = (viewInstance: EditorView, prevState: any) => {
              // Capture view update
              this.captureViewUpdateInternal(viewInstance, prevState);
              
              // Call original update if exists
              if (this.originalUpdate) {
                this.originalUpdate(viewInstance, prevState);
              }
            };
          } catch (e) {
            // If props.update is read-only, we can't wrap it directly
            // Fall back to tracking through transactions only
            console.warn(
              'ProseMirrorPlugin: Cannot wrap props.update (may be read-only). ' +
              'View update tracking will be limited to transaction-based updates.'
            );
            this.originalUpdate = undefined;
          }
        } else {
          // No update function provided - this is normal for some EditorView configurations
          // We'll track updates through transactions instead
        }
      }
    }

    // Capture focus/blur events if enabled
    // These are DOM events on the EditorView's DOM element
    if (config.trackFocus) {
      const dom = view.dom;
      if (dom && dom instanceof HTMLElement) {
        this.focusHandler = () => this.captureFocusEvent('focus');
        this.blurHandler = () => this.captureFocusEvent('blur');
        dom.addEventListener('focus', this.focusHandler);
        dom.addEventListener('blur', this.blurHandler);
      } else {
        console.warn('ProseMirrorPlugin: DOM element not found on EditorView. Focus tracking may not work.');
      }
    }

    // Track plugin state changes if enabled
    // Access plugins from the injected EditorView's state
    if (config.trackPluginStates) {
      const state = view.state;
      if (state && state.plugins) {
        state.plugins.forEach((plugin: any, i: number) => {
          const key = plugin.key || `plugin-${i}`;
          try {
            this.previousPluginStates.set(key, plugin.getState(state));
          } catch (e) {
            // Some plugins may not have getState
          }
        });
      }
    }

    // Track command execution if enabled
    // Note: Command tracking requires wrapping commands at application level
    // We provide captureCommand() method for this purpose
    if (config.trackCommands) {
      // Commands are tracked via captureCommand() method calls
      // from application code
    }

    // Track history state if enabled
    // History state is tracked through plugin state changes
    if (config.trackHistory) {
      // History tracking happens in captureViewUpdateInternal
      // when history plugin is detected
    }
    
    // Setup cleanup function to restore original methods
    this.unsubscribe = () => {
      if (!this.view) return;
      
      const viewToClean = this.view as any;
      
      // Restore original dispatchTransaction
      if (this.originalDispatchTransaction) {
        viewToClean.dispatchTransaction = this.originalDispatchTransaction;
        this.originalDispatchTransaction = undefined;
      }
      
      // Restore original update
      if (this.originalUpdate && viewToClean.props) {
        viewToClean.props.update = this.originalUpdate;
        this.originalUpdate = undefined;
      }
      
      // Remove focus/blur listeners
      if (config.trackFocus && viewToClean.dom) {
        if (this.focusHandler) {
          viewToClean.dom.removeEventListener('focus', this.focusHandler);
          this.focusHandler = undefined;
        }
        if (this.blurHandler) {
          viewToClean.dom.removeEventListener('blur', this.blurHandler);
          this.blurHandler = undefined;
        }
      }
    };
  }

  protected onDetach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  protected onDestroy(): void {
    this.onDetach();
    // Clear the EditorView reference
    this.view = null;
    // this.editor is cleared by BasePlugin.destroy()
  }

  /**
   * Handle a ProseMirror transaction
   * This is called from the wrapped dispatchTransaction method
   */
  private handleTransaction(transaction: any): void {
    // Store previous state before transaction is applied
    // This is needed for view update tracking (if props.update wrapping fails)
    const prevStateBeforeTransaction = this.view?.state;
    
    // Capture transaction before dispatching
    // This captures the transaction data, but state hasn't changed yet
    this.captureTransaction(transaction);
    
    // Call original dispatch on the injected EditorView
    // This will apply the transaction and update the state
    // ProseMirror will then call props.update if it's set
    if (this.originalDispatchTransaction) {
      this.originalDispatchTransaction(transaction);
    }
    
    // After transaction is applied, capture view update if enabled
    // BUT only if props.update is NOT wrapped (to avoid duplicate tracking)
    // If props.update is wrapped, it will handle view update tracking
    const config = this.options.config || {};
    if (config.trackViewUpdates && this.view && prevStateBeforeTransaction && !this.originalUpdate) {
      // props.update is not wrapped, so we track here
      // Capture the view update with correct prevState and newState
      this.captureViewUpdateInternal(this.view, prevStateBeforeTransaction);
    }
  }

  /**
   * Capture a ProseMirror transaction
   * This is called from handleTransaction
   */
  private captureTransaction(transaction: any): void {
    const config = this.options.config || {};
    
    // If no tracking is enabled, skip early
    if (!config.trackSteps && !config.trackDocument && !config.trackSelection && 
        !config.trackMarks && !config.trackViewUpdates) {
      return;
    }

    // Transaction 데이터 구성 (timestamp와 relatedEventId는 제외)
    const transactionData: Omit<TransactionData, 'timestamp' | 'relatedEventId'> = {
      steps: [],
      time: transaction.time,
      storedMarks: transaction.storedMarks,
      meta: transaction.meta,
      docChanged: transaction.docChanged,
      selectionChanged: transaction.selectionSet,
    };

    // Capture steps if enabled
    if (config.trackSteps && transaction.steps) {
      transactionData.steps = transaction.steps.map((step: any) => {
        let sliceData: any = undefined;
        if (step.slice) {
          try {
            sliceData = {
              size: step.slice.size,
              content: step.slice.content?.toJSON ? step.slice.content.toJSON() : undefined,
            };
          } catch (e) {
            // If toJSON fails (e.g., circular reference), just store size
            sliceData = {
              size: step.slice.size,
            };
          }
        }
        return {
          stepType: step.constructor.name,
          from: step.from,
          to: step.to,
          slice: sliceData,
        };
      });
    }

    // BasePlugin의 addEditorEvent를 사용하여 저장
    // 타임스탬프와 relatedEventId는 자동으로 처리됨
    // relatedEventId는 BasePlugin.findRelatedContentEditableEvent()에서 자동으로 찾아짐
    this.addEditorEvent('transaction', transactionData);
    
    // Track selection changes separately if enabled
    // Note: We track selection from transaction, but the actual state change
    // happens after the transaction is applied, so we'll get it in the next state
    if (config.trackSelection && transaction.selectionSet && this.view) {
      // The selection in view.state is still the old one at this point
      // We'll track the new selection after the transaction is applied
      // For now, we track what the transaction says will change
    }
    
    // Track mark changes if enabled
    if (config.trackMarks && transaction.storedMarks) {
      this.captureMarkChange('update', transaction.storedMarks);
    }
    
    // Note: maxTransactionHistory is handled by BasePlugin.maxEditorEvents
    // But we also respect the config value if provided
    const maxHistory = config.maxTransactionHistory;
    if (maxHistory !== undefined && this.editorEvents.length > maxHistory) {
      // Trim to max history (keep most recent)
      this.editorEvents = this.editorEvents.slice(-maxHistory);
    }
  }

  /**
   * Capture view update (internal method)
   * Called from the wrapped update prop (if props.update wrapping works)
   * OR can be called manually after transaction if props.update wrapping doesn't work
   */
  private captureViewUpdateInternal(view: EditorView, prevState: any): void {
    const config = this.options.config || {};
    if (!config.trackViewUpdates) return;

    const currentState = view.state;
    const prevDocSize = prevState?.doc?.content?.size || 0;
    const currentDocSize = currentState.doc?.content?.size || 0;
    
    const updateData: Omit<ViewUpdateData, 'timestamp' | 'relatedEventId'> = {
      prevState: prevState ? {
        docSize: prevDocSize,
        selection: {
          from: prevState.selection?.from || 0,
          to: prevState.selection?.to || 0,
          anchor: prevState.selection?.anchor || 0,
          head: prevState.selection?.head || 0,
        },
      } : undefined,
      newState: {
        docSize: currentDocSize,
        selection: {
          from: currentState.selection?.from || 0,
          to: currentState.selection?.to || 0,
          anchor: currentState.selection?.anchor || 0,
          head: currentState.selection?.head || 0,
        },
      },
      docChanged: prevState?.doc !== currentState.doc,
      selectionChanged: prevState?.selection !== currentState.selection,
      tr: currentState.tr ? {
        steps: currentState.tr.steps?.length || 0,
        time: currentState.tr.time,
        storedMarks: currentState.tr.storedMarks,
        // meta is private, skip it
      } : undefined,
    };

    // BasePlugin의 addEditorEvent를 사용하여 저장
    // relatedEventId는 자동으로 처리됨
    this.addEditorEvent('viewUpdate', updateData);
    
    // Track selection changes after state update
    // Now the selection in view.state is the new one
    if (config.trackSelection && this.view) {
      this.captureSelectionChange(this.view.state.selection);
    }

    // Track plugin state changes if enabled
    if (config.trackPluginStates) {
      this.capturePluginStateChanges(prevState, currentState);
    }

    // Track history state if enabled
    if (config.trackHistory) {
      this.captureHistoryState(currentState);
    }
  }

  /**
   * Capture selection change
   */
  private captureSelectionChange(selection: any): void {
    const config = this.options.config || {};
    if (!config.trackSelection) return;

    // Skip if selection hasn't actually changed
    if (this.previousSelection && 
        this.previousSelection.from === selection.from &&
        this.previousSelection.to === selection.to &&
        this.previousSelection.anchor === selection.anchor &&
        this.previousSelection.head === selection.head) {
      return;
    }

    const selectionData: Omit<SelectionChangeData, 'timestamp' | 'relatedEventId'> = {
      from: selection.from || 0,
      to: selection.to || 0,
      anchor: selection.anchor || 0,
      head: selection.head || 0,
      empty: selection.empty || false,
      storedMarks: selection.$from?.marks() || [],
      selectionType: selection.constructor?.name || 'unknown',
    };

    this.addEditorEvent('selectionChange', selectionData);
    this.previousSelection = selection;
  }

  /**
   * Capture focus/blur event
   */
  private captureFocusEvent(type: 'focus' | 'blur'): void {
    const config = this.options.config || {};
    if (!config.trackFocus || !this.view) return;

    // Access the stored EditorView instance
    const state = this.view.state;
    const focusData: Omit<FocusEventData, 'timestamp' | 'relatedEventId'> = {
      type,
      hasSelection: !state.selection.empty,
      selection: state.selection.empty ? undefined : {
        from: state.selection.from,
        to: state.selection.to,
      },
    };

    this.addEditorEvent('focus', focusData);
  }

  /**
   * Capture mark change
   */
  private captureMarkChange(type: 'add' | 'remove' | 'update', marks: any[]): void {
    const config = this.options.config || {};
    if (!config.trackMarks || !this.view) return;

    // Access the stored EditorView instance
    const state = this.view.state;
    const selection = state.selection;
    
    const markData: Omit<MarkChangeData, 'timestamp' | 'relatedEventId'> = {
      type,
      marks: marks.map((mark: any) => ({
        type: mark.type?.name || 'unknown',
        attrs: mark.attrs || {},
      })),
      position: {
        from: selection.from,
        to: selection.to,
      },
    };

    this.addEditorEvent('markChange', markData);
  }

  /**
   * Capture plugin state changes
   */
  private capturePluginStateChanges(prevState: any, currentState: any): void {
    if (!this.view) return;

    const prevPlugins = prevState?.plugins || [];
    const currentPlugins = currentState.plugins || [];

    currentPlugins.forEach((plugin: any, i: number) => {
      const key = plugin.key || `plugin-${i}`;
      const prevPluginState = this.previousPluginStates.get(key);
      const currentPluginState = plugin.getState(currentState);

      // Check if state changed
      if (prevPluginState !== currentPluginState) {
        const pluginStateData: Omit<PluginStateChangeData, 'timestamp' | 'relatedEventId'> = {
          pluginKey: key,
          prevState: prevPluginState,
          newState: currentPluginState,
          changed: true,
        };

        this.addEditorEvent('pluginStateChange', pluginStateData);
        this.previousPluginStates.set(key, currentPluginState);
      }
    });
  }

  /**
   * Capture history state (undo/redo)
   */
  private captureHistoryState(state: any): void {
    if (!this.view) return;

    // Try to find history plugin
    const historyPlugin = state.plugins.find((p: any) => {
      const key = p.key || '';
      return key.includes('history') || key.includes('undo');
    });

    if (!historyPlugin) return;

    try {
      const historyState = historyPlugin.getState(state);
      if (!historyState) return;

      // Check if undo/redo happened by comparing with previous state
      const prevHistoryState = this.previousPluginStates.get('history');
      
      if (prevHistoryState) {
        const prevUndoDepth = prevHistoryState.done?.length || 0;
        const currentUndoDepth = historyState.done?.length || 0;
        const prevRedoDepth = prevHistoryState.undone?.length || 0;
        const currentRedoDepth = historyState.undone?.length || 0;

        let historyType: 'undo' | 'redo' | undefined;
        if (currentUndoDepth < prevUndoDepth) {
          historyType = 'undo';
        } else if (currentRedoDepth < prevRedoDepth) {
          historyType = 'redo';
        }

        if (historyType) {
          const historyData: Omit<HistoryStateData, 'timestamp' | 'relatedEventId'> = {
            type: historyType,
            canUndo: currentUndoDepth > 0,
            canRedo: currentRedoDepth > 0,
            undoDepth: currentUndoDepth,
            redoDepth: currentRedoDepth,
          };

          this.addEditorEvent('history', historyData);
        }
      }

      this.previousPluginStates.set('history', historyState);
    } catch (e) {
      // History plugin might not be available or have different structure
    }
  }

  /**
   * Capture command execution
   * This should be called from application code that wraps commands
   */
  captureCommand(commandName: string, args: any[], success: boolean, transaction?: any): void {
    const config = this.options.config || {};
    if (!config.trackCommands) return;

    const commandData: Omit<CommandData, 'timestamp' | 'relatedEventId'> = {
      commandName,
      args,
      success,
      transaction: transaction ? {
        steps: transaction.steps?.length || 0,
        docChanged: transaction.docChanged || false,
        selectionChanged: transaction.selectionSet || false,
      } : undefined,
    };

    this.addEditorEvent('command', commandData);
  }

  /**
   * Get current ProseMirror state
   * Returns state from the stored EditorView instance
   */
  getState(): any {
    if (!this.view) return null;

    // Access the stored EditorView instance
    const state = this.view.state;
    const config = this.options.config || {};

    return {
      doc: config.trackDocument ? state.doc.toJSON() : undefined,
      selection: config.trackSelection ? {
        from: state.selection.from,
        to: state.selection.to,
        anchor: state.selection.anchor,
        head: state.selection.head,
        empty: state.selection.empty,
      } : undefined,
      storedMarks: state.storedMarks,
      transactionCount: this.editorEvents.length,
    };
  }

  /**
   * Get all editor events
   * BasePlugin의 getEvents()를 오버라이드하여 모든 이벤트 타입을 반환
   */
  getEvents(): PluginEvent[] {
    // BasePlugin의 editorEvents를 그대로 반환 (이미 올바른 형식)
    return this.editorEvents.map(event => ({
      type: event.type,
      timestamp: event.timestamp,
      relatedEventId: event.relatedEventId,
      data: event.data,
    }));
  }

  /**
   * Get document structure as serializable data
   * Returns ProseMirror document structure as JSON for StructureRenderer
   */
  getStructureData(): any {
    if (!this.view) return null;

    const config = this.options.config || {};
    if (!config.trackDocument) return null;

    try {
      const state = this.view.state;
      const doc = state.doc;
      return this.docToStructureNode(doc);
    } catch (error) {
      console.warn('ProseMirrorPlugin: Failed to get structure data', error);
      return null;
    }
  }

  /**
   * Convert ProseMirror node to structure node
   */
  private docToStructureNode(node: any): any {
    const nodeType = node.type?.name || 'unknown';
    const attrs = node.attrs && Object.keys(node.attrs).length > 0 ? node.attrs : undefined;
    
    const structureNode: any = {
      type: nodeType,
    };

    if (attrs) {
      structureNode.attrs = attrs;
    }

    // Add text content if it's a text node
    if (nodeType === 'text' && node.text) {
      structureNode.text = node.text;
    }

    // Recursively add children
    if (node.content && node.content.content) {
      structureNode.children = node.content.content.map((child: any) => 
        this.docToStructureNode(child)
      );
    }

    return structureNode;
  }

}

