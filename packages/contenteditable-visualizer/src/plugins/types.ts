/**
 * Plugin system types for editor-specific integrations
 */

import type { ContentEditableVisualizer } from '../index';

/**
 * Plugin lifecycle events
 */
export interface PluginEvents {
  /**
   * Called when the plugin is attached to the visualizer
   */
  onAttach?: (visualizer: ContentEditableVisualizer) => void;
  
  /**
   * Called when the plugin is detached from the visualizer
   */
  onDetach?: () => void;
  
  /**
   * Called when a snapshot is captured
   */
  onSnapshot?: (snapshotId: number) => void;
  
  /**
   * Called when an event is logged
   */
  onEvent?: (eventType: string, data?: any) => void;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /**
   * Unique plugin identifier
   */
  id: string;
  
  /**
   * Plugin name
   */
  name: string;
  
  /**
   * Plugin version
   */
  version: string;
  
  /**
   * Editor framework this plugin supports (e.g., 'prosemirror', 'slate', 'lexical')
   */
  editor: string;
  
  /**
   * Plugin description
   */
  description?: string;
}

/**
 * Plugin interface that all editor plugins must implement
 */
export interface VisualizerPlugin {
  /**
   * Plugin metadata
   */
  readonly metadata: PluginMetadata;
  
  /**
   * Initialize the plugin with the editor instance
   * @param editor - The editor instance (type depends on editor framework)
   * @param visualizer - The visualizer instance
   */
  initialize(editor: any, visualizer: ContentEditableVisualizer): void;
  
  /**
   * Attach event listeners and start monitoring
   */
  attach(): void;
  
  /**
   * Detach event listeners and stop monitoring
   */
  detach(): void;
  
  /**
   * Get current editor state snapshot
   * @returns Editor-specific state data
   */
  getState?(): any;
  
  /**
   * Get editor-specific events since last snapshot
   * @returns Array of editor events
   */
  getEvents?(): any[];
  
  /**
   * Clean up resources
   */
  destroy(): void;
}

/**
 * Plugin configuration options
 */
export interface PluginOptions {
  /**
   * Whether to enable the plugin
   */
  enabled?: boolean;
  
  /**
   * Plugin-specific configuration
   */
  config?: Record<string, any>;
}

