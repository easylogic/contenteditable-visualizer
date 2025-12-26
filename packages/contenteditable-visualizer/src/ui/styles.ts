/**
 * Style utility - Helper functions for adding <style> tags to head
 */

const STYLE_ID = 'cev-styles';

/**
 * Adds styles to head.
 * Updates if already exists.
 */
export function injectStyles(css: string, id: string = STYLE_ID): void {
  let styleElement = document.head.querySelector(`style[data-${id}]`) as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.setAttribute(`data-${id}`, 'true');
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = css;
}

/**
 * Removes styles.
 */
export function removeStyles(id: string = STYLE_ID): void {
  const styleElement = document.head.querySelector(`style[data-${id}]`);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * FloatingPanel style definitions
 */
export const floatingPanelStyles = {
  base: `
    .cev-floating-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
    }

    .cev-toggle-button {
      width: 48px;
      height: 48px;
      border-radius: 24px;
      border: none;
      background: #3b82f6;
      color: white;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cev-toggle-button:hover {
      background: #2563eb;
      transform: scale(1.05);
    }

    .cev-toggle-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      line-height: 1.4;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      z-index: 1;
    }

    @keyframes cev-badge-pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }

    .cev-panel {
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      resize: none; /* Prevent browser default resize */
      z-index: 999999;
    }

    .cev-panel.cev-resizing {
      user-select: none;
      pointer-events: none;
    }

    .cev-resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      cursor: nwse-resize;
      background: transparent;
      z-index: 10;
    }

    .cev-resize-handle:hover {
      background: rgba(59, 130, 246, 0.1);
    }

    .cev-resize-handle::after {
      content: '';
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 0 8px 8px;
      border-color: transparent transparent #9ca3af transparent;
      pointer-events: none;
    }

    [data-theme="dark"] .cev-resize-handle::after,
    .cev-panel.dark .cev-resize-handle::after {
      border-color: transparent transparent #6b7280 transparent;
    }

    [data-theme="dark"] .cev-panel,
    .cev-panel.dark {
      background: #1f2937;
      color: #f9fafb;
    }

    .cev-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    [data-theme="dark"] .cev-panel-header,
    .cev-panel.dark .cev-panel-header {
      background: #111827;
      border-bottom-color: #374151;
    }

    .cev-panel-title {
      font-weight: 600;
      font-size: 16px;
    }

    .cev-tabs {
      display: flex;
      gap: 8px;
    }

    .cev-tab {
      padding: 6px 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      color: #6b7280;
      transition: all 0.2s;
    }

    .cev-tab:hover {
      background: #e5e7eb;
      color: #111827;
    }

    [data-theme="dark"] .cev-tab:hover,
    .cev-panel.dark .cev-tab:hover {
      background: #374151;
      color: #f9fafb;
    }

    .cev-tab.active {
      background: #3b82f6;
      color: white;
    }

    .cev-tab-badge {
      display: inline-block;
      margin-left: 6px;
      background: rgba(255, 255, 255, 0.3);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    [data-theme="dark"] .cev-tab-badge,
    .cev-panel.dark .cev-tab-badge {
      background: rgba(255, 255, 255, 0.2);
    }

    .cev-close-button {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 20px;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .cev-close-button:hover {
      background: #e5e7eb;
      color: #111827;
    }

    [data-theme="dark"] .cev-close-button:hover,
    .cev-panel.dark .cev-close-button:hover {
      background: #374151;
      color: #f9fafb;
    }

    .cev-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .cev-event-viewer,
    .cev-snapshot-viewer {
      display: block;
    }

    .cev-event-viewer[data-view="snapshots"],
    .cev-snapshot-viewer[data-view="events"] {
      display: none;
    }

    .cev-empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #9ca3af;
    }

    .cev-event-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #f9fafb;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }

    [data-theme="dark"] .cev-event-item,
    .cev-panel.dark .cev-event-item {
      background: #111827;
      border-left-color: #60a5fa;
    }

    .cev-event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .cev-event-type {
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      color: #3b82f6;
    }

    .cev-event-time {
      font-size: 12px;
      color: #9ca3af;
    }

    .cev-event-data {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      background: white;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    [data-theme="dark"] .cev-event-data,
    .cev-panel.dark .cev-event-data {
      background: #1f2937;
    }

    .cev-snapshot-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #f9fafb;
      border-radius: 6px;
      border-left: 3px solid #10b981;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cev-snapshot-item:hover {
      background: #f3f4f6;
      transform: translateX(2px);
    }

    [data-theme="dark"] .cev-snapshot-item,
    .cev-panel.dark .cev-snapshot-item {
      background: #111827;
      border-left-color: #34d399;
    }

    [data-theme="dark"] .cev-snapshot-item:hover,
    .cev-panel.dark .cev-snapshot-item:hover {
      background: #1f2937;
    }

    .cev-snapshot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .cev-snapshot-trigger {
      font-weight: 600;
      font-size: 13px;
      color: #10b981;
    }

    .cev-snapshot-time {
      font-size: 12px;
      color: #9ca3af;
    }

    .cev-snapshot-env {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
  `,

  position: {
    'top-right': `
      .cev-floating-container {
        top: 20px;
        right: 20px;
      }
      .cev-panel {
        bottom: calc(100% + 12px);
        right: 0;
      }
    `,
    'top-left': `
      .cev-floating-container {
        top: 20px;
        left: 20px;
      }
      .cev-panel {
        bottom: calc(100% + 12px);
        left: 0;
      }
    `,
    'bottom-left': `
      .cev-floating-container {
        bottom: 20px;
        left: 20px;
      }
      .cev-panel {
        bottom: calc(100% + 12px);
        left: 0;
      }
    `,
    'bottom-right': `
      .cev-floating-container {
        bottom: 20px;
        right: 20px;
      }
      .cev-panel {
        bottom: calc(100% + 12px);
        right: 0;
      }
    `,
  },
};

/**
 * Generates complete styles based on position.
 */
export function getFloatingPanelStyles(position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'): string {
  return floatingPanelStyles.base + floatingPanelStyles.position[position];
}

/**
 * Automatically injects default styles.
 * Executes automatically when module is loaded.
 */
let stylesInjected = false;

export function ensureStylesInjected(position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'bottom-right'): void {
  if (!stylesInjected) {
    const css = getFloatingPanelStyles(position);
    injectStyles(css);
    stylesInjected = true;
  }
}

// Auto-inject default styles on module load
if (typeof document !== 'undefined') {
  ensureStylesInjected();
}

