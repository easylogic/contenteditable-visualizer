/**
 * ProseMirror plugin for contenteditable-visualizer
 */

import { BasePlugin } from 'contenteditable-visualizer';
import type { PluginMetadata, PluginOptions } from 'contenteditable-visualizer';
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
 */
export class ProseMirrorPlugin extends BasePlugin {
  readonly metadata = PROSEMIRROR_PLUGIN_METADATA;
  
  private view: EditorView | null = null;
  private transactionHistory: TransactionData[] = [];
  private originalDispatchTransaction?: (tr: any) => void;
  private unsubscribe?: () => void;

  constructor(options: ProseMirrorPluginOptions = {}) {
    super(options);
  }

  protected onInitialize(): void {
    this.view = this.editor as EditorView;
    
    const view = this.view as any;
    if (!this.view || !view.dispatchTransaction) {
      throw new Error('ProseMirrorPlugin: Invalid EditorView instance');
    }
  }

  protected onAttach(): void {
    if (!this.view) return;

    // Wrap dispatchTransaction to capture transactions
    const view = this.view as any;
    this.originalDispatchTransaction = view.dispatchTransaction.bind(view);
    
    view.dispatchTransaction = (transaction: any) => {
      // Capture transaction before dispatching
      this.captureTransaction(transaction);
      
      // Call original dispatch
      this.originalDispatchTransaction!(transaction);
    };
    
    this.unsubscribe = () => {
      if (this.view && this.originalDispatchTransaction) {
        const view = this.view as any;
        view.dispatchTransaction = this.originalDispatchTransaction;
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
    this.transactionHistory = [];
    this.view = null;
  }

  /**
   * Capture a ProseMirror transaction
   */
  private captureTransaction(transaction: any): void {
    const config = this.options.config || {};
    
    if (!config.trackSteps && !config.trackDocument && !config.trackSelection) {
      return;
    }

    const transactionData: TransactionData = {
      timestamp: Date.now(),
      steps: [],
      time: transaction.time,
      storedMarks: transaction.storedMarks,
      meta: transaction.meta,
      docChanged: transaction.docChanged,
      selectionChanged: transaction.selectionSet,
    };

    // Capture steps if enabled
    if (config.trackSteps && transaction.steps) {
      transactionData.steps = transaction.steps.map((step: any) => ({
        stepType: step.constructor.name,
        from: step.from,
        to: step.to,
        slice: step.slice ? {
          size: step.slice.size,
          content: step.slice.content?.toJSON(),
        } : undefined,
      }));
    }

    this.transactionHistory.push(transactionData);
    
    // Keep only last N transactions
    const maxHistory = config.maxTransactionHistory ?? 100;
    if (this.transactionHistory.length > maxHistory) {
      this.transactionHistory.shift();
    }
  }

  /**
   * Get current ProseMirror state
   */
  getState(): any {
    if (!this.view) return null;

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
      transactionCount: this.transactionHistory.length,
    };
  }

  /**
   * Get transaction history
   */
  getEvents(): TransactionData[] {
    return this.transactionHistory.slice();
  }
}

