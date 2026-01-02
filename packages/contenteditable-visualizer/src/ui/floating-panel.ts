import type { EventLog } from '../core/event-logger';
import type { Snapshot } from '../core/snapshot-manager';
import type { FloatingPanelConfig } from '../types';
import { removeStyles, getFloatingPanelStyles, injectStyles } from './styles';
import { extractLastSets, createPhaseBlock } from './event-viewer-utils';
import { extractEventPairs } from '../core/event-pair';

export type FloatingPanelOptions = FloatingPanelConfig;

/**
 * FloatingPanel - Floating UI panel for viewing events and snapshots
 * 
 * @example
 * ```typescript
 * const panel = new FloatingPanel({
 *   position: 'bottom-right',
 *   container: document.body
 * });
 * ```
 */
export class FloatingPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private toggleButton: HTMLElement;
  private badge: HTMLElement | null = null;
  private resizeHandle: HTMLElement | null = null;
  private isOpen = false;
  private currentView: 'events' | 'snapshots' = 'events';
  private options: FloatingPanelOptions;
  private parentContainer: HTMLElement;

  private eventViewer: HTMLElement | null = null;
  private snapshotViewer: HTMLElement | null = null;
  
  private snapshotCount: number = 0;
  private recentSnapshot: Snapshot | null = null; // Track recent snapshot for event viewer styling
  
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;

  /**
   * Creates a new FloatingPanel instance
   * 
   * @param options - Panel configuration options
   */
  constructor(options: FloatingPanelOptions = {}) {
    this.options = {
      position: options.position || 'bottom-right',
      theme: options.theme || 'auto',
      container: options.container,
      resizable: options.resizable !== false, // Default: true
      toggleButtonSize: options.toggleButtonSize || 48,
      panelWidth: options.panelWidth || 500,
      panelHeight: options.panelHeight || 600,
      panelMinWidth: options.panelMinWidth || 300,
      panelMinHeight: options.panelMinHeight || 200,
      panelMaxWidth: options.panelMaxWidth ?? window.innerWidth * 0.9,
      panelMaxHeight: options.panelMaxHeight ?? window.innerHeight * 0.9,
    };

    this.parentContainer = this.options.container || document.body;

    this.container = this.createContainer();
    this.toggleButton = this.createToggleButton();
    this.panel = this.createPanel();

    this.container.appendChild(this.toggleButton);
    // Panel is attached directly to document.body, not to container
    document.body.appendChild(this.panel);
    this.parentContainer.appendChild(this.container);
    this.applyStyles();
    
    // Listen for window resize to adjust panel position
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.calculateAndSetPanelPosition();
      }
    });
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cev-floating-container';
    
    // If custom container is specified (and not document.body), use absolute positioning
    // Otherwise, keep default fixed positioning (from CSS)
    if (this.options.container && this.options.container !== document.body) {
      container.style.position = 'absolute';
      // Ensure parent container has relative positioning
      const computedStyle = window.getComputedStyle(this.parentContainer);
      if (computedStyle.position === 'static') {
        this.parentContainer.style.position = 'relative';
      }
    }
    // Default is fixed (from CSS), so no need to set it explicitly
    
    return container;
  }

  private createToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'cev-toggle-button';
    button.innerHTML = '🔍';
    button.setAttribute('aria-label', 'Toggle visualizer panel');
    button.style.position = 'relative';
    const buttonSize = this.options.toggleButtonSize ?? 48;
    button.style.width = `${buttonSize}px`;
    button.style.height = `${buttonSize}px`;
    button.style.borderRadius = `${buttonSize / 2}px`;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });
    
    // Create badge
    this.badge = document.createElement('span');
    this.badge.className = 'cev-toggle-badge';
    this.badge.style.cssText = `
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
      display: none;
    `;
    button.appendChild(this.badge);
    
    return button;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'cev-panel dark'; // Always use dark theme
    panel.style.display = 'none';
    panel.style.width = `${this.options.panelWidth}px`;
    panel.style.height = `${this.options.panelHeight}px`;
    panel.style.minWidth = `${this.options.panelMinWidth}px`;
    panel.style.minHeight = `${this.options.panelMinHeight}px`;
    panel.style.maxWidth = `${this.options.panelMaxWidth}px`;
    panel.style.maxHeight = `${this.options.panelMaxHeight}px`;

    const header = this.createHeader();
    const content = this.createContent();

    panel.appendChild(header);
    panel.appendChild(content);

    // Add resize handle if resizable
    if (this.options.resizable) {
      this.resizeHandle = this.createResizeHandle();
      panel.appendChild(this.resizeHandle);
      this.setupResizeHandlers();
    }

    return panel;
  }

  private createResizeHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'cev-resize-handle';
    handle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      background: transparent;
      z-index: 10;
    `;
    
    // Visual indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 0 8px 8px;
      border-color: transparent transparent #9ca3af transparent;
      pointer-events: none;
    `;
    handle.appendChild(indicator);
    
    return handle;
  }

  private setupResizeHandlers(): void {
    if (!this.resizeHandle || !this.options.resizable) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      this.isResizing = true;
      this.resizeStartX = e.clientX;
      this.resizeStartY = e.clientY;
      this.resizeStartWidth = this.panel.offsetWidth;
      this.resizeStartHeight = this.panel.offsetHeight;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      // Add resizing class for visual feedback
      this.panel.classList.add('cev-resizing');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;

      const deltaX = e.clientX - this.resizeStartX;
      const deltaY = e.clientY - this.resizeStartY;

      let newWidth = this.resizeStartWidth + deltaX;
      let newHeight = this.resizeStartHeight + deltaY;

      // Apply constraints
      const minWidth = this.options.panelMinWidth ?? 300;
      const maxWidth = this.options.panelMaxWidth ?? window.innerWidth * 0.9;
      const minHeight = this.options.panelMinHeight ?? 200;
      const maxHeight = this.options.panelMaxHeight ?? window.innerHeight * 0.9;
      
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

      this.panel.style.width = `${newWidth}px`;
      this.panel.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      this.isResizing = false;
      this.panel.classList.remove('cev-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.resizeHandle.addEventListener('mousedown', onMouseDown);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cev-panel-header';

    const title = document.createElement('div');
    title.className = 'cev-panel-title';
    title.textContent = 'ContentEditable Visualizer';

    const tabs = document.createElement('div');
    tabs.className = 'cev-tabs';

    const eventsTab = document.createElement('button');
    eventsTab.className = 'cev-tab active';
    eventsTab.textContent = 'Events';
    eventsTab.addEventListener('click', () => this.switchView('events'));

    const snapshotsTab = document.createElement('button');
    snapshotsTab.className = 'cev-tab';
    const snapshotsTabText = document.createElement('span');
    snapshotsTabText.textContent = 'Snapshots';
    snapshotsTab.appendChild(snapshotsTabText);
    
    // Add snapshot count badge to tab
    const snapshotsTabBadge = document.createElement('span');
    snapshotsTabBadge.className = 'cev-tab-badge';
    snapshotsTabBadge.style.cssText = `
      margin-left: 6px;
      background: rgba(255, 255, 255, 0.3);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    `;
    snapshotsTab.appendChild(snapshotsTabBadge);
    
    snapshotsTab.addEventListener('click', () => this.switchView('snapshots'));
    
    // Store reference for updating badge
    (this as any).snapshotsTabBadge = snapshotsTabBadge;

    tabs.appendChild(eventsTab);
    tabs.appendChild(snapshotsTab);

    const closeButton = document.createElement('button');
    closeButton.className = 'cev-close-button';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close panel');
    closeButton.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(tabs);
    header.appendChild(closeButton);

    return header;
  }

  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'cev-panel-content';

    this.eventViewer = this.createEventViewer();
    this.snapshotViewer = this.createSnapshotViewer();

    content.appendChild(this.eventViewer);
    content.appendChild(this.snapshotViewer);

    return content;
  }

  private createEventViewer(): HTMLElement {
    const viewer = document.createElement('div');
    viewer.className = 'cev-event-viewer';
    viewer.setAttribute('data-view', 'events');

    const emptyState = document.createElement('div');
    emptyState.className = 'cev-empty-state';
    emptyState.textContent = 'No events logged yet. Interact with the editor to see events.';
    viewer.appendChild(emptyState);

    return viewer;
  }

  private createSnapshotViewer(): HTMLElement {
    const viewer = document.createElement('div');
    viewer.className = 'cev-snapshot-viewer';
    viewer.setAttribute('data-view', 'snapshots');
    viewer.style.display = 'none';

    const emptyState = document.createElement('div');
    emptyState.className = 'cev-empty-state';
    emptyState.textContent = 'No snapshots captured yet.';
    viewer.appendChild(emptyState);

    return viewer;
  }

  private applyStyles(): void {
    // Inject styles according to position (updates even if already injected)
    const position = this.options.position || 'bottom-right';
    const css = getFloatingPanelStyles(position);
    injectStyles(css);
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (!this.panel) return;
    this.isOpen = true;
    // First show the panel (needed for proper position calculation)
    this.panel.style.display = 'flex';
    // Use requestAnimationFrame to ensure DOM is updated before calculating position
    requestAnimationFrame(() => {
      this.calculateAndSetPanelPosition();
    });
    this.updateView();
  }

  /**
   * Calculates and sets panel position based on button's current position
   */
  private calculateAndSetPanelPosition(): void {
    if (!this.panel || !this.container) return;
    
    const position = this.options.position || 'bottom-right';
    const buttonRect = this.container.getBoundingClientRect();
    const panelWidth = this.panel.offsetWidth; // Use actual rendered width
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Reset all position styles
    this.panel.style.top = '';
    this.panel.style.bottom = '';
    this.panel.style.left = '';
    this.panel.style.right = '';
    
    let top: number | string = '';
    let bottom: number | string = '';
    let left: number | string = '';
    let right: number | string = '';
    
    // Calculate horizontal position
    if (position === 'bottom-right' || position === 'top-right') {
      // Align with right edge of button
      const rightPos = viewportWidth - buttonRect.right;
      // Check if panel would overflow to the left
      if (buttonRect.right < panelWidth + 20) {
        // Not enough space on right side, align with left edge of button
        left = buttonRect.left;
        right = '';
      } else {
        // Enough space, align with right edge of button
        right = rightPos;
        left = '';
      }
    } else {
      // bottom-left or top-left
      // Align with left edge of button
      if (buttonRect.left + panelWidth > viewportWidth - 20) {
        // Not enough space on left side, align with right edge of button
        right = viewportWidth - buttonRect.right;
        left = '';
      } else {
        // Enough space, align with left edge of button
        left = buttonRect.left;
        right = '';
      }
    }
    
    // Calculate vertical position
    if (position === 'bottom-right' || position === 'bottom-left') {
      // For bottom-* positions, always place above button using bottom
      // This ensures panel appears above the button at the bottom of the screen
      bottom = viewportHeight - buttonRect.top + padding;
      top = '';
    } else {
      // top-right or top-left
      // For top-* positions, always place below button using top
      // This ensures panel appears below the button at the top of the screen
      top = buttonRect.bottom + padding;
      bottom = '';
    }
    
    // Apply calculated positions
    if (top !== '') {
      this.panel.style.top = typeof top === 'number' ? `${top}px` : String(top);
    }
    if (bottom !== '') {
      this.panel.style.bottom = typeof bottom === 'number' ? `${bottom}px` : String(bottom);
    }
    if (left !== '') {
      this.panel.style.left = typeof left === 'number' ? `${left}px` : String(left);
    }
    if (right !== '') {
      this.panel.style.right = typeof right === 'number' ? `${right}px` : String(right);
    }
  }


  close(): void {
    this.isOpen = false;
    this.panel.style.display = 'none';
  }

  switchView(view: 'events' | 'snapshots'): void {
    this.currentView = view;
    this.updateView();
  }

  private updateView(): void {
    const tabs = this.panel.querySelectorAll('.cev-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    if (this.currentView === 'events') {
      tabs[0]?.classList.add('active');
      if (this.eventViewer) this.eventViewer.style.display = 'block';
      if (this.snapshotViewer) this.snapshotViewer.style.display = 'none';
    } else {
      tabs[1]?.classList.add('active');
      if (this.eventViewer) this.eventViewer.style.display = 'none';
      if (this.snapshotViewer) this.snapshotViewer.style.display = 'block';
    }
  }

  updateEvents(events: EventLog[]): void {
    if (!this.eventViewer) return;

    // Clear existing content
    this.eventViewer.innerHTML = '';

    if (events.length === 0) {
      const emptyStateEl = document.createElement('div');
      emptyStateEl.className = 'cev-empty-state';
      emptyStateEl.textContent = 'No events logged yet. Interact with the editor to see events.';
      this.eventViewer.appendChild(emptyStateEl);
      return;
    }

    // Create phase container (DevTools style)
    const phaseContainer = document.createElement('div');
    phaseContainer.className = 'cev-phases';
    this.eventViewer.appendChild(phaseContainer);

    // Sort events by timestamp (시간 순서대로 정렬)
    const sortedAll = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Filter relevant events (composition, beforeinput, input, selectionchange)
    const relevantEvents: EventLog[] = [];
    for (const log of sortedAll) {
      if (
        log.type === 'compositionstart' ||
        log.type === 'compositionupdate' ||
        log.type === 'compositionend' ||
        log.type === 'beforeinput' ||
        log.type === 'input' ||
        log.type === 'selectionchange'
      ) {
        relevantEvents.push(log);
      }
    }

    if (relevantEvents.length === 0) {
      const emptyStateEl = document.createElement('div');
      emptyStateEl.className = 'cev-empty-state';
      emptyStateEl.textContent = 'No composition/beforeinput/input set';
      phaseContainer.appendChild(emptyStateEl);
      return;
    }

    // Calculate base timestamp (첫 번째 이벤트 기준)
    const baseTs = relevantEvents[0]?.timestamp ?? null;

    // Get base text from the most recent input event
    let baseTextForPreview = '';
    for (let i = relevantEvents.length - 1; i >= 0; i--) {
      const log = relevantEvents[i];
      if (log.type === 'input' && log.startContainerText) {
        baseTextForPreview = log.startContainerText.toString();
        break;
      }
    }

    // Extract event pairs for abnormal detection (snapshot용)
    const allPairs = extractEventPairs(sortedAll);
    const latestPair = allPairs.length > 0 ? allPairs[allPairs.length - 1] : null;
    const lastBi = latestPair?.beforeInput ?? null;
    const lastIn = latestPair?.input ?? null;

    // Determine if we should apply abnormal styling based on recent snapshot
    const snapshotAbnormalMap = new Map<EventLog, { class: string; info: string }>();
    
    if (this.recentSnapshot && this.recentSnapshot.trigger) {
      const trigger = this.recentSnapshot.trigger;
      const triggerDetail = this.recentSnapshot.triggerDetail || '';
      const snapshotTime = this.recentSnapshot.timestamp;
      
      for (const log of relevantEvents) {
        if (log.type === 'input' || log.type === 'beforeinput') {
          const eventTime = log.timestamp;
          const timeDiff = eventTime && snapshotTime ? Math.abs(eventTime - snapshotTime) : Infinity;
          
          if (timeDiff < 100) {
            let abnormalClass = 'cev-phase-block--abnormal';
            if (trigger === 'range-mapping-fail' || trigger.includes('range-mapping-fail')) {
              abnormalClass = 'cev-phase-block--range-mapping-fail';
            }
            
            let scenarioInfo = `⚠️ Scenario: ${trigger}`;
            if (triggerDetail) {
              scenarioInfo += ` - ${triggerDetail}`;
            }
            
            snapshotAbnormalMap.set(log, { class: abnormalClass, info: scenarioInfo });
          }
        }
      }
    }

    // Render events in chronological order (시간 순서대로 표시)
    for (const log of relevantEvents) {
      const deltaMs = log.timestamp != null && baseTs != null 
        ? log.timestamp - baseTs 
        : null;

      let extraClassName: string | undefined;
      let extraLines: string[] | undefined;
      let beforeLog: EventLog | null = null;

      if (log.type === 'input') {
        // Check for abnormal styling from snapshot
        const abnormalInfo = snapshotAbnormalMap.get(log);
        if (abnormalInfo) {
          extraClassName = abnormalInfo.class;
          extraLines = [abnormalInfo.info];
        } else {
          // Check for parent/node mismatch with beforeinput
          if (lastBi && lastIn && log === lastIn) {
            const sameParent = (lastBi.parent?.id ?? '') === (lastIn.parent?.id ?? '');
            const sameNode = (lastBi.node?.nodeName ?? '') === (lastIn.node?.nodeName ?? '');
            
            if (!sameParent || !sameNode) {
              extraClassName = 'cev-phase-block--input-different';
            }
          }
        }
        beforeLog = lastBi;
      }

      const block = createPhaseBlock(
        log.type.toUpperCase(),
        log,
        baseTextForPreview,
        {
          extraClassName,
          timestampMs: log.timestamp ?? null,
          deltaMs,
          extraLines,
          beforeLog,
        }
      );
      
      if (block) {
        phaseContainer.appendChild(block);
      }
    }

    // If no phases, show empty state
    if (phaseContainer.children.length === 0) {
      const emptyStateEl = document.createElement('div');
      emptyStateEl.className = 'cev-empty-state';
      emptyStateEl.textContent = 'No composition/beforeinput/input set';
      phaseContainer.appendChild(emptyStateEl);
    }
  }

  updateSnapshots(snapshots: Snapshot[]): void {
    if (!this.snapshotViewer) return;

    this.snapshotCount = snapshots.length;
    this.updateBadge();

    // Store the most recent snapshot for event viewer styling
    this.recentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    this.snapshotViewer.innerHTML = '';

    if (snapshots.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'cev-empty-state';
      emptyState.textContent = 'No snapshots captured yet.';
      this.snapshotViewer.appendChild(emptyState);
      return;
    }

    snapshots.forEach(snapshot => {
      const item = this.createSnapshotItem(snapshot);
      this.snapshotViewer!.appendChild(item);
    });
  }

  /**
   * Updates the badge on the toggle button and tabs
   */
  private updateBadge(): void {
    if (!this.badge) return;

    // Show snapshot count on badge (prioritize snapshots)
    const count = this.snapshotCount;
    
    if (count > 0) {
      this.badge.textContent = count > 99 ? '99+' : String(count);
      this.badge.style.display = 'block';
      
      // Add pulse animation for new snapshots
      this.badge.style.animation = 'none';
      setTimeout(() => {
        if (this.badge) {
          this.badge.style.animation = 'cev-badge-pulse 0.3s ease-out';
        }
      }, 10);
    } else {
      this.badge.style.display = 'none';
    }
    
    // Update tab badge
    const snapshotsTabBadge = (this as any).snapshotsTabBadge;
    if (snapshotsTabBadge) {
      if (count > 0) {
        snapshotsTabBadge.textContent = String(count);
        snapshotsTabBadge.style.display = 'inline-block';
      } else {
        snapshotsTabBadge.style.display = 'none';
      }
    }
  }

  private createSnapshotItem(snapshot: Snapshot): HTMLElement {
    const item = document.createElement('div');
    item.className = 'cev-snapshot-item';

    const header = document.createElement('div');
    header.className = 'cev-snapshot-header';

    const trigger = document.createElement('div');
    trigger.className = 'cev-snapshot-trigger';
    trigger.textContent = snapshot.trigger || 'manual';

    const time = document.createElement('div');
    time.className = 'cev-snapshot-time';
    time.textContent = new Date(snapshot.timestamp).toLocaleString();

    header.appendChild(trigger);
    header.appendChild(time);

    const env = document.createElement('div');
    env.className = 'cev-snapshot-env';
    env.textContent = `${snapshot.environment.os} ${snapshot.environment.osVersion} / ${snapshot.environment.browser} ${snapshot.environment.browserVersion}`;

    item.appendChild(header);
    item.appendChild(env);

    // Add AI prompt indicator if available
    if (snapshot.aiPrompt) {
      const aiIndicator = document.createElement('div');
      aiIndicator.className = 'cev-snapshot-ai-indicator';
      aiIndicator.textContent = '🤖 AI Prompt Available';
      aiIndicator.style.cssText = 'font-size: 11px; color: #10b981; margin-top: 4px;';
      item.appendChild(aiIndicator);
    }

    item.addEventListener('click', () => {
      // Show snapshot detail with AI prompt
      this.showSnapshotDetail(snapshot);
      // Also emit event for backward compatibility
      const event = new CustomEvent('cev-snapshot-selected', {
        detail: snapshot,
      });
      document.dispatchEvent(event);
    });

    return item;
  }

  private showSnapshotDetail(snapshot: Snapshot): void {
    // Create detail modal/overlay
    const overlay = document.createElement('div');
    overlay.className = 'cev-snapshot-detail-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.className = 'cev-snapshot-detail-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
    
    const title = document.createElement('h3');
    title.textContent = `Snapshot: ${snapshot.trigger || 'manual'}`;
    title.style.cssText = 'margin: 0;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px 8px;';
    closeBtn.addEventListener('click', () => overlay.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    
    // Basic info
    const info = document.createElement('div');
    info.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 4px;';
    info.innerHTML = `
      <div><strong>Timestamp:</strong> ${new Date(snapshot.timestamp).toLocaleString()}</div>
      <div><strong>Environment:</strong> ${snapshot.environment.os} ${snapshot.environment.osVersion} / ${snapshot.environment.browser} ${snapshot.environment.browserVersion}</div>
      <div><strong>Events:</strong> ${snapshot.eventLogs.length}</div>
    `;
    content.appendChild(info);

    // AI Prompt section
    if (snapshot.aiPrompt) {
      const aiSection = document.createElement('div');
      aiSection.style.cssText = 'margin-bottom: 16px;';
      
      const aiHeader = document.createElement('div');
      aiHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
      
      const aiTitle = document.createElement('h4');
      aiTitle.textContent = '🤖 AI Analysis Prompt';
      aiTitle.style.cssText = 'margin: 0;';
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '📋 Copy Prompt';
      copyBtn.style.cssText = 'background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(snapshot.aiPrompt!);
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Prompt';
          }, 2000);
        } catch (error) {
          console.error('Failed to copy prompt:', error);
          // Fallback: select text
          const textarea = document.createElement('textarea');
          textarea.value = snapshot.aiPrompt!;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Prompt';
          }, 2000);
        }
      });
      
      aiHeader.appendChild(aiTitle);
      aiHeader.appendChild(copyBtn);
      
      const aiContent = document.createElement('pre');
      aiContent.style.cssText = `
        background: #1f2937;
        color: #f9fafb;
        padding: 16px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      aiContent.textContent = snapshot.aiPrompt;
      
      aiSection.appendChild(aiHeader);
      aiSection.appendChild(aiContent);
      content.appendChild(aiSection);
    }

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  destroy(): void {
    this.container.remove();
    if (this.panel && this.panel.parentNode) {
      this.panel.remove();
    }
    removeStyles();
  }
}

