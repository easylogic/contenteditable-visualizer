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
      background: #1f2937; /* Dark base */
      color: #f9fafb; /* Light text */
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
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
      border-color: transparent transparent #6b7280 transparent;
      pointer-events: none;
    }

    .cev-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #374151;
      background: #111827;
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
      color: #9ca3af;
      transition: all 0.2s;
    }

    .cev-tab:hover {
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
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .cev-close-button:hover {
      background: #374151;
      color: #f9fafb;
    }

    .cev-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
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
      color: #6b7280;
    }

    /* DevTools-style phase blocks */
    .cev-phases {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 12px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      border-top: 1px solid #374151;
    }

    .cev-phase-block {
      border: 1px solid #374151;
      border-radius: 4px;
      overflow: hidden;
      background-color: rgba(255, 255, 255, 0.01);
    }

    .cev-phase-block--abnormal {
      border-color: #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }

    .cev-phase-block--abnormal .cev-phase-header {
      background-color: rgba(239, 68, 68, 0.2);
      border-bottom-color: #ef4444;
      color: #fca5a5;
    }

    .cev-phase-block--range-mapping-fail {
      border-color: #f59e0b;
      background-color: rgba(245, 158, 11, 0.1);
    }

    .cev-phase-block--range-mapping-fail .cev-phase-header {
      background-color: rgba(245, 158, 11, 0.2);
      border-bottom-color: #f59e0b;
      color: #fcd34d;
    }

    .cev-phase-block--input-different {
      border-color: #f97316;
      box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.5);
      background-color: rgba(249, 115, 22, 0.06);
    }

    .cev-phase-block--input-different .cev-phase-header {
      background-color: rgba(249, 115, 22, 0.18);
      border-bottom-color: #f97316;
      color: #ea580c;
    }

    .cev-phase-header {
      padding: 4px 8px;
      font-weight: 600;
      letter-spacing: 0.02em;
      background-color: #1f2937;
      color: #f9fafb;
      border-bottom: 1px solid #374151;
    }

    .cev-phase-body {
      margin: 0;
      padding: 6px 8px;
      white-space: pre-wrap;
      word-break: break-all;
      color: #f9fafb;
      background-color: transparent;
    }

    .cev-phase-key {
      color: #9ca3af;
      font-weight: 500;
    }

    .cev-phase-offset {
      color: #60a5fa;
      font-weight: 600;
    }

    .cev-phase-id {
      color: #34d399;
      font-weight: 600;
      margin-left: 2px;
    }

    .cev-phase-text {
      color: #e5e7eb;
      font-style: italic;
      opacity: 0.9;
    }

    .cev-special-char {
      display: inline-block;
      padding: 0 2px;
      border-radius: 2px;
      margin: 0 1px;
      font-size: 10px;
      font-weight: 600;
    }

    .cev-special-char--space {
      background-color: rgba(59, 130, 246, 0.2);
      color: #bfdbfe;
    }

    .cev-special-char--zwnbsp {
      background-color: rgba(217, 70, 239, 0.2);
      color: #f5d0fe;
    }

    .cev-special-char--nbsp {
      background-color: rgba(234, 179, 8, 0.2);
      color: #facc15;
    }

    .cev-special-char--lf {
      background-color: rgba(34, 197, 94, 0.2);
      color: #bbf7d0;
    }

    .cev-selection-range {
      background-color: rgba(59, 130, 246, 0.28);
      border-radius: 2px;
      padding: 0 1px;
    }

    .cev-caret {
      display: inline-block;
      height: 1em;
      background-color: #38bdf8;
      color: #38bdf8;
      vertical-align: text-bottom;
      margin: 0 1px;
    }

    [data-theme="dark"] .cev-caret,
    .cev-panel.dark .cev-caret {
      background-color: #0ea5e9;
      color: #0ea5e9;
    }

    .cev-parent-tag {
      display: inline-block;
      padding: 0 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background-color: rgba(15, 23, 42, 0.6);
      color: #e5e7eb;
    }

    .cev-parent-tag--before {
      border-color: rgba(56, 189, 248, 0.9);
      background-color: rgba(8, 47, 73, 0.9);
      color: #e0f2fe;
    }

    .cev-node-tag {
      display: inline-block;
      padding: 0 4px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background-color: rgba(15, 23, 42, 0.4);
      color: #e5e7eb;
    }

    .cev-node-tag--before {
      border-color: rgba(56, 189, 248, 0.8);
      background-color: rgba(8, 47, 73, 0.7);
      color: #e0f2fe;
    }

    .cev-snapshot-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #111827;
      border-radius: 6px;
      border-left: 3px solid #34d399;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cev-snapshot-item:hover {
      background: #1f2937;
      transform: translateX(2px);
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
      color: #34d399;
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

