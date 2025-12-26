/**
 * Type definitions for ContentEditable Visualizer
 */

export type FloatingPanelPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type FloatingPanelTheme = 'light' | 'dark' | 'auto';
export type EventLogType = 'selectionchange' | 'compositionstart' | 'compositionupdate' | 'compositionend' | 'beforeinput' | 'input';

export interface VisualizerColorScheme {
  selection?: {
    fill?: string;
    stroke?: string;
  };
  composition?: {
    fill?: string;
    stroke?: string;
  };
  beforeinput?: {
    fill?: string;
    stroke?: string;
  };
  input?: {
    fill?: string;
    stroke?: string;
  };
  deleted?: {
    fill?: string;
    stroke?: string;
  };
  added?: {
    fill?: string;
    stroke?: string;
  };
}

/**
 * Required color scheme with all properties filled
 */
export type RequiredVisualizerColorScheme = Required<{
  [K in keyof VisualizerColorScheme]: Required<VisualizerColorScheme[K]>;
}>;

export interface FloatingPanelConfig {
  position?: FloatingPanelPosition;
  theme?: FloatingPanelTheme;
  container?: HTMLElement;
  resizable?: boolean; // Enable panel resizing (default: true)
  toggleButtonSize?: number; // px (default: 48)
  panelWidth?: number; // px (default: 500)
  panelHeight?: number; // px (default: 600)
  panelMinWidth?: number; // px (default: 300)
  panelMinHeight?: number; // px (default: 200)
  panelMaxWidth?: number; // px (default: 90vw)
  panelMaxHeight?: number; // px (default: 90vh)
}

export interface ContentEditableVisualizerOptions {
  visualize?: boolean; // Enable range visualization (default: true)
  logEvents?: boolean; // Enable event logging (default: true)
  snapshots?: boolean; // Enable snapshot functionality (default: true)
  panel?: boolean | FloatingPanelConfig; // Show floating panel (default: true) or panel configuration
  autoSnapshot?: boolean; // Automatically capture snapshots on input (default: false)
  container?: HTMLElement; // Container for overlay (default: element itself)
  maxLogs?: number; // Maximum number of event logs to keep (default: 1000, 0 = unlimited)
  throttleSelection?: number; // Throttle delay for selectionchange events in ms (default: 100)
  colors?: VisualizerColorScheme; // Custom color scheme
  onError?: (error: Error, context: string) => void; // Error callback
}

