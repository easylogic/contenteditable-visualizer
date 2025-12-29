/**
 * Base plugin class for editor integrations
 */

import type { ContentEditableVisualizer } from '../index';
import type { VisualizerPlugin, PluginMetadata, PluginOptions } from './types';

/**
 * Base class for editor plugins
 */
export abstract class BasePlugin implements VisualizerPlugin {
  protected visualizer: ContentEditableVisualizer | null = null;
  protected editor: any = null;
  protected attached: boolean = false;
  protected options: PluginOptions;

  abstract readonly metadata: PluginMetadata;

  constructor(options: PluginOptions = {}) {
    this.options = {
      enabled: true,
      ...options,
    };
  }

  /**
   * Initialize the plugin with editor and visualizer instances
   */
  initialize(editor: any, visualizer: ContentEditableVisualizer): void {
    if (!this.options.enabled) {
      return;
    }

    this.editor = editor;
    this.visualizer = visualizer;
    
    this.onInitialize();
  }

  /**
   * Hook for plugin-specific initialization
   */
  protected onInitialize(): void {
    // Override in subclasses
  }

  /**
   * Attach the plugin
   */
  attach(): void {
    if (!this.options.enabled || this.attached || !this.editor || !this.visualizer) {
      return;
    }

    this.attached = true;
    this.onAttach();
  }

  /**
   * Hook for plugin-specific attachment logic
   */
  protected onAttach(): void {
    // Override in subclasses
  }

  /**
   * Detach the plugin
   */
  detach(): void {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.onDetach();
  }

  /**
   * Hook for plugin-specific detachment logic
   */
  protected onDetach(): void {
    // Override in subclasses
  }

  /**
   * Get current editor state (optional)
   */
  getState?(): any {
    return null;
  }

  /**
   * Get editor events (optional)
   */
  getEvents?(): any[] {
    return [];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.detach();
    this.editor = null;
    this.visualizer = null;
    this.onDestroy();
  }

  /**
   * Hook for plugin-specific cleanup
   */
  protected onDestroy(): void {
    // Override in subclasses
  }
}

