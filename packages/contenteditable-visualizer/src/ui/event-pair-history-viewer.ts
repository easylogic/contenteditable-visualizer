/**
 * 이벤트 쌍 히스토리 뷰어
 * 
 * 최근 N개 이벤트 쌍을 표시하고, 각 쌍 전/후의 에디터 로그를 함께 보여줍니다.
 */

import type { EventLog } from '../core/event-logger';
import type { EventPair } from '../core/event-pair';
import type { AbnormalDetection } from '../core/abnormal-detector';
import type { VisualizerPlugin } from '../plugins/types';
import type { PluginEvent } from '../plugins/base';
import { createPhaseBlock } from './event-viewer-utils';

export type EventPairWithContext = {
  pair: EventPair;
  detection?: AbnormalDetection;
  beforeEditorEvents: Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }>;
  afterEditorEvents: Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }>;
  index: number; // 히스토리 내 인덱스 (0 = 가장 최근)
};

export type EventPairHistoryViewerOptions = {
  maxPairs?: number; // 최대 표시할 쌍 개수 (기본값: 10)
  showEditorEvents?: boolean; // 에디터 이벤트 표시 여부 (기본값: true)
  timeWindow?: number; // 에디터 이벤트 수집 시간 윈도우 (ms, 기본값: 100ms)
};

/**
 * 이벤트 쌍 히스토리 뷰어
 */
export class EventPairHistoryViewer {
  private container: HTMLElement;
  private options: Required<EventPairHistoryViewerOptions>;
  private plugins: Map<string, VisualizerPlugin>;

  constructor(
    container: HTMLElement,
    plugins: Map<string, VisualizerPlugin>,
    options: EventPairHistoryViewerOptions = {}
  ) {
    this.container = container;
    this.plugins = plugins;
    this.options = {
      maxPairs: options.maxPairs ?? 10,
      showEditorEvents: options.showEditorEvents ?? true,
      timeWindow: options.timeWindow ?? 100,
    };
  }

  /**
   * 이벤트 쌍 히스토리 업데이트
   */
  update(
    eventPairs: EventPair[],
    detections: Map<string, AbnormalDetection>,
    allEvents: EventLog[]
  ): void {
    this.container.innerHTML = '';

    if (eventPairs.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'cev-empty-state';
      emptyState.textContent = 'No event pairs yet. Interact with the editor to see event pairs.';
      this.container.appendChild(emptyState);
      return;
    }

    // 최근 N개 쌍만 표시 (최신순)
    const recentPairs = eventPairs.slice(-this.options.maxPairs).reverse();
    const baseTimestamp = allEvents.length > 0 ? allEvents[0].timestamp : Date.now();

    // 각 쌍에 대한 컨텍스트 수집
    const pairsWithContext: EventPairWithContext[] = recentPairs.map((pair, index) => {
      const beforeEditorEvents = this.collectEditorEventsBefore(
        pair.beforeInput
      );
      const afterEditorEvents = this.collectEditorEventsAfter(
        pair.input
      );
      const detection = pair.eventKey ? detections.get(pair.eventKey) : undefined;

      return {
        pair,
        detection,
        beforeEditorEvents,
        afterEditorEvents,
        index,
      };
    });

    // 각 쌍 렌더링
    pairsWithContext.forEach((pairContext) => {
      const pairBlock = this.createPairBlock(pairContext, baseTimestamp);
      this.container.appendChild(pairBlock);
    });
  }

  /**
   * beforeinput 전의 에디터 이벤트 수집
   */
  private collectEditorEventsBefore(
    beforeInput: EventLog | null
  ): Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }> {
    if (!beforeInput || !this.options.showEditorEvents) {
      return [];
    }

    const result: Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }> = [];
    const beforeTime = beforeInput.timestamp;

    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (!plugin.getEvents) continue;

      try {
        const pluginEvents = (plugin.getEvents() || []) as PluginEvent[];
        // beforeinput 전 timeWindow 내의 이벤트만 수집
        const relevantEvents = pluginEvents.filter(
          (event) =>
            event.timestamp < beforeTime &&
            beforeTime - event.timestamp <= this.options.timeWindow
        );

        if (relevantEvents.length > 0) {
          result.push({
            pluginId,
            pluginName: plugin.metadata?.name || pluginId,
            events: relevantEvents,
          });
        }
      } catch (error) {
        console.warn(`Failed to get events from plugin ${pluginId}:`, error);
      }
    }

    return result;
  }

  /**
   * input 후의 에디터 이벤트 수집
   */
  private collectEditorEventsAfter(
    input: EventLog | null
  ): Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }> {
    if (!input || !this.options.showEditorEvents) {
      return [];
    }

    const result: Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }> = [];
    const afterTime = input.timestamp;

    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (!plugin.getEvents) continue;

      try {
        const pluginEvents = (plugin.getEvents() || []) as PluginEvent[];
        // input 후 timeWindow 내의 이벤트만 수집
        const relevantEvents = pluginEvents.filter(
          (event) =>
            event.timestamp > afterTime &&
            event.timestamp - afterTime <= this.options.timeWindow
        );

        if (relevantEvents.length > 0) {
          result.push({
            pluginId,
            pluginName: plugin.metadata?.name || pluginId,
            events: relevantEvents,
          });
        }
      } catch (error) {
        console.warn(`Failed to get events from plugin ${pluginId}:`, error);
      }
    }

    return result;
  }

  /**
   * 이벤트 쌍 블록 생성
   */
  private createPairBlock(
    pairContext: EventPairWithContext,
    baseTimestamp: number
  ): HTMLElement {
    const { pair, detection, beforeEditorEvents, afterEditorEvents, index } = pairContext;
    const { beforeInput, input } = pair;

    const block = document.createElement('div');
    block.className = 'cev-event-pair-history-block';
    block.setAttribute('data-pair-index', String(index));

    // 쌍 헤더
    const header = this.createPairHeader(pair, detection, index);
    block.appendChild(header);

    // Before Editor Events (beforeinput 전)
    if (beforeEditorEvents.length > 0) {
      const beforeSection = this.createEditorEventsSection(
        'Before',
        beforeEditorEvents,
        beforeInput?.timestamp || 0
      );
      block.appendChild(beforeSection);
    }

    // BeforeInput 이벤트
    if (beforeInput) {
      const beforeInputBlock = createPhaseBlock(
        'BEFOREINPUT',
        beforeInput,
        beforeInput.startContainerText || '',
        {
          timestampMs: beforeInput.timestamp,
          deltaMs: beforeInput.timestamp - baseTimestamp,
          extraClassName: 'cev-event-pair-history-phase',
        }
      );
      if (beforeInputBlock) {
        block.appendChild(beforeInputBlock);
      }
    } else {
      const missingBlock = document.createElement('div');
      missingBlock.className = 'cev-phase-block cev-phase-block--missing';
      missingBlock.innerHTML = `
        <div class="cev-phase-header">
          <span class="cev-phase-label">BEFOREINPUT</span>
          <span class="cev-phase-status">⚠️ Missing</span>
        </div>
      `;
      block.appendChild(missingBlock);
    }

    // After Editor Events (input 후)
    if (afterEditorEvents.length > 0) {
      const afterSection = this.createEditorEventsSection(
        'After',
        afterEditorEvents,
        input?.timestamp || 0
      );
      block.appendChild(afterSection);
    }

    // Input 이벤트
    if (input) {
      const inputBlock = createPhaseBlock(
        'INPUT',
        input,
        input.startContainerText || '',
        {
          timestampMs: input.timestamp,
          deltaMs: input.timestamp - baseTimestamp,
          extraClassName: detection?.isAbnormal
            ? 'cev-event-pair-history-phase cev-phase-block--abnormal'
            : 'cev-event-pair-history-phase',
          extraLines: detection?.isAbnormal
            ? [
                `⚠️ ${detection.detail}`,
                detection.scenarioDescription
                  ? `Scenario: ${detection.scenarioDescription}`
                  : '',
              ].filter(Boolean)
            : undefined,
        }
      );
      if (inputBlock) {
        block.appendChild(inputBlock);
      }
    } else {
      const missingBlock = document.createElement('div');
      missingBlock.className = 'cev-phase-block cev-phase-block--missing';
      missingBlock.innerHTML = `
        <div class="cev-phase-header">
          <span class="cev-phase-label">INPUT</span>
          <span class="cev-phase-status">⚠️ Missing</span>
        </div>
      `;
      block.appendChild(missingBlock);
    }

    return block;
  }

  /**
   * 쌍 헤더 생성
   */
  private createPairHeader(
    pair: EventPair,
    detection: AbnormalDetection | undefined,
    index: number
  ): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cev-event-pair-history-header';

    const pairNumber = document.createElement('span');
    pairNumber.className = 'cev-event-pair-number';
    pairNumber.textContent = `Pair #${index + 1}`;
    header.appendChild(pairNumber);

    // 비정상 감지 배지
    if (detection?.isAbnormal) {
      const badge = document.createElement('span');
      badge.className = 'cev-event-pair-badge cev-event-pair-badge--abnormal';
      badge.textContent = `⚠️ ${detection.trigger || 'Abnormal'}`;
      if (detection.scenarioId) {
        badge.title = `Scenario ID: ${detection.scenarioId}`;
      }
      header.appendChild(badge);
    }

    // InputType 불일치 배지
    if (pair.inputTypeMismatch) {
      const mismatchBadge = document.createElement('span');
      mismatchBadge.className = 'cev-event-pair-badge cev-event-pair-badge--mismatch';
      mismatchBadge.textContent = '⚠️ InputType Mismatch';
      header.appendChild(mismatchBadge);
    }

    // 타임스탬프 정보
    const timestampInfo = document.createElement('span');
    timestampInfo.className = 'cev-event-pair-timestamp';
    if (pair.beforeInput && pair.input) {
      const delta = pair.timestampDelta;
      timestampInfo.textContent = `Δ ${delta}ms`;
      timestampInfo.title = `Time between beforeinput and input: ${delta}ms`;
    } else if (pair.beforeInput) {
      timestampInfo.textContent = 'BeforeInput only';
    } else if (pair.input) {
      timestampInfo.textContent = 'Input only';
    }
    header.appendChild(timestampInfo);

    return header;
  }

  /**
   * 에디터 이벤트 섹션 생성
   */
  private createEditorEventsSection(
    label: string,
    editorEvents: Array<{ pluginId: string; pluginName: string; events: PluginEvent[] }>,
    referenceTimestamp: number
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'cev-editor-events-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'cev-editor-events-header';
    sectionHeader.textContent = `${label} Editor Events`;
    section.appendChild(sectionHeader);

    editorEvents.forEach(({ pluginName, events }) => {
      const pluginBlock = document.createElement('div');
      pluginBlock.className = 'cev-editor-events-plugin';

      const pluginHeader = document.createElement('div');
      pluginHeader.className = 'cev-editor-events-plugin-header';
      pluginHeader.textContent = `${pluginName} (${events.length})`;
      pluginBlock.appendChild(pluginHeader);

      const eventsList = document.createElement('div');
      eventsList.className = 'cev-editor-events-list';

      events.forEach((event) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'cev-editor-event-item';

        const eventType = document.createElement('span');
        eventType.className = 'cev-editor-event-type';
        eventType.textContent = event.type;
        eventItem.appendChild(eventType);

        const eventTime = document.createElement('span');
        eventTime.className = 'cev-editor-event-time';
        const delta = event.timestamp - referenceTimestamp;
        eventTime.textContent = `Δ ${delta > 0 ? '+' : ''}${delta.toFixed(1)}ms`;
        eventItem.appendChild(eventTime);

        // 이벤트 데이터 미리보기
        if (event.data) {
          const eventPreview = document.createElement('div');
          eventPreview.className = 'cev-editor-event-preview';
          try {
            const preview = JSON.stringify(event.data).substring(0, 100);
            eventPreview.textContent = preview;
            eventPreview.title = JSON.stringify(event.data, null, 2);
          } catch {
            eventPreview.textContent = String(event.data).substring(0, 100);
          }
          eventItem.appendChild(eventPreview);
        }

        eventsList.appendChild(eventItem);
      });

      pluginBlock.appendChild(eventsList);
      section.appendChild(pluginBlock);
    });

    return section;
  }
}
