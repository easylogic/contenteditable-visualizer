/**
 * EventPairHistoryViewer 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventPairHistoryViewer } from './event-pair-history-viewer';
import type { EventLog } from '../core/event-logger';
import type { EventPair } from '../core/event-pair';
import type { AbnormalDetection } from '../core/abnormal-detector';
import type { VisualizerPlugin } from '../plugins/types';
import type { PluginEvent } from '../plugins/base';

describe('EventPairHistoryViewer', () => {
  let container: HTMLElement;
  let plugins: Map<string, VisualizerPlugin>;
  let mockPlugin: VisualizerPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    plugins = new Map();

    // Mock plugin
    mockPlugin = {
      metadata: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      },
      initialize: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      destroy: vi.fn(),
      getEvents: vi.fn(() => []),
    };

    plugins.set('test-plugin', mockPlugin);
  });

  describe('초기화', () => {
    it('기본 옵션으로 초기화되어야 함', () => {
      const viewer = new EventPairHistoryViewer(container, plugins);
      expect(viewer).toBeDefined();
    });

    it('커스텀 옵션으로 초기화되어야 함', () => {
      const viewer = new EventPairHistoryViewer(container, plugins, {
        maxPairs: 5,
        showEditorEvents: false,
        timeWindow: 200,
      });
      expect(viewer).toBeDefined();
    });
  });

  describe('update - 빈 상태', () => {
    it('이벤트 쌍이 없을 때 빈 상태 메시지를 표시해야 함', () => {
      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([], new Map(), []);

      const emptyState = container.querySelector('.cev-empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No event pairs yet');
    });
  });

  describe('update - 이벤트 쌍 표시', () => {
    it('단일 이벤트 쌍을 표시해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [beforeInput, input]);

      const blocks = container.querySelectorAll('.cev-event-pair-history-block');
      expect(blocks.length).toBe(1);
    });

    it('최대 쌍 개수 제한을 적용해야 함', () => {
      const baseTime = 1000;
      const pairs: EventPair[] = [];

      // 15개의 쌍 생성
      for (let i = 0; i < 15; i++) {
        const beforeInput: EventLog = {
          id: i * 2 + 1,
          type: 'beforeinput',
          timestamp: baseTime + i * 100,
          inputType: 'insertText',
          data: String(i),
          startOffset: i,
          endOffset: i,
        };

        const input: EventLog = {
          id: i * 2 + 2,
          type: 'input',
          timestamp: baseTime + i * 100 + 10,
          inputType: 'insertText',
          data: String(i),
          startOffset: i + 1,
          endOffset: i + 1,
        };

        pairs.push({
          beforeInput,
          input,
          eventKey: `key-${i}`,
          inputTypeMismatch: false,
          timestampDelta: 10,
        });
      }

      const viewer = new EventPairHistoryViewer(container, plugins, { maxPairs: 10 });
      viewer.update(pairs, new Map(), []);

      const blocks = container.querySelectorAll('.cev-event-pair-history-block');
      expect(blocks.length).toBe(10);
    });

    it('최신 쌍이 먼저 표시되어야 함', () => {
      const baseTime = 1000;
      const pairs: EventPair[] = [];

      for (let i = 0; i < 3; i++) {
        const beforeInput: EventLog = {
          id: i * 2 + 1,
          type: 'beforeinput',
          timestamp: baseTime + i * 100,
          inputType: 'insertText',
          data: String(i),
          startOffset: i,
          endOffset: i,
        };

        const input: EventLog = {
          id: i * 2 + 2,
          type: 'input',
          timestamp: baseTime + i * 100 + 10,
          inputType: 'insertText',
          data: String(i),
          startOffset: i + 1,
          endOffset: i + 1,
        };

        pairs.push({
          beforeInput,
          input,
          eventKey: `key-${i}`,
          inputTypeMismatch: false,
          timestampDelta: 10,
        });
      }

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update(pairs, new Map(), []);

      const blocks = container.querySelectorAll('.cev-event-pair-history-block');
      expect(blocks.length).toBe(3);

      // 첫 번째 블록이 가장 최신 쌍이어야 함 (Pair #1)
      const firstBlock = blocks[0];
      const pairNumber = firstBlock.querySelector('.cev-event-pair-number');
      expect(pairNumber?.textContent).toBe('Pair #1');
    });
  });

  describe('에디터 이벤트 수집', () => {
    it('beforeinput 전의 에디터 이벤트를 수집해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      // beforeinput 전 100ms 내의 에디터 이벤트 (timeWindow: 100)
      const editorEvents: PluginEvent[] = [
        {
          type: 'transaction',
          timestamp: baseTime - 30, // 30ms 전 (윈도우 내)
          data: { steps: [] },
        },
        {
          type: 'transaction',
          timestamp: baseTime - 150, // 150ms 전 (윈도우 밖)
          data: { steps: [] },
        },
      ];

      vi.mocked(mockPlugin.getEvents).mockReturnValue(editorEvents);

      const viewer = new EventPairHistoryViewer(container, plugins, { timeWindow: 100 });
      viewer.update([pair], new Map(), [beforeInput, input]);

      const beforeSection = container.querySelector('.cev-editor-events-section');
      expect(beforeSection).toBeTruthy();
      expect(beforeSection?.textContent).toContain('Before Editor Events');

      const eventItems = container.querySelectorAll('.cev-editor-event-item');
      expect(eventItems.length).toBe(1); // 시간 윈도우 내의 이벤트만
    });

    it('input 후의 에디터 이벤트를 수집해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      // input 후 50ms 내의 에디터 이벤트
      const editorEvents: PluginEvent[] = [
        {
          type: 'update',
          timestamp: baseTime + 20,
          data: { state: {} },
        },
        {
          type: 'update',
          timestamp: baseTime + 120, // 시간 윈도우 밖
          data: { state: {} },
        },
      ];

      vi.mocked(mockPlugin.getEvents).mockReturnValue(editorEvents);

      const viewer = new EventPairHistoryViewer(container, plugins, { timeWindow: 100 });
      viewer.update([pair], new Map(), [beforeInput, input]);

      const afterSections = container.querySelectorAll('.cev-editor-events-section');
      const afterSection = Array.from(afterSections).find(
        (section) => section.textContent?.includes('After Editor Events')
      );
      expect(afterSection).toBeTruthy();

      const eventItems = afterSection?.querySelectorAll('.cev-editor-event-item');
      expect(eventItems?.length).toBe(1); // 시간 윈도우 내의 이벤트만
    });

    it('showEditorEvents가 false일 때 에디터 이벤트를 수집하지 않아야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      const editorEvents: PluginEvent[] = [
        {
          type: 'transaction',
          timestamp: baseTime - 30,
          data: { steps: [] },
        },
      ];

      vi.mocked(mockPlugin.getEvents).mockReturnValue(editorEvents);

      const viewer = new EventPairHistoryViewer(container, plugins, {
        showEditorEvents: false,
      });
      viewer.update([pair], new Map(), [beforeInput, input]);

      const editorSections = container.querySelectorAll('.cev-editor-events-section');
      expect(editorSections.length).toBe(0);
    });
  });

  describe('비정상 감지 배지', () => {
    it('비정상 이벤트 쌍에 배지를 표시해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      const detection: AbnormalDetection = {
        isAbnormal: true,
        trigger: 'parent-mismatch',
        detail: 'Parent node mismatch detected',
        scenarioId: '1.1',
        scenarioDescription: 'Parent mismatch scenario',
      };

      const detections = new Map<string, AbnormalDetection>();
      detections.set('test-key', detection);

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], detections, [beforeInput, input]);

      const badge = container.querySelector('.cev-event-pair-badge--abnormal');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('parent-mismatch');
      expect(badge?.getAttribute('title')).toContain('Scenario ID: 1.1');
    });

    it('InputType 불일치 배지를 표시해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'deleteContentBackward',
        data: null,
        startOffset: 0,
        endOffset: 0,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: true,
        timestampDelta: 10,
      };

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [beforeInput, input]);

      const mismatchBadge = container.querySelector('.cev-event-pair-badge--mismatch');
      expect(mismatchBadge).toBeTruthy();
      expect(mismatchBadge?.textContent).toContain('InputType Mismatch');
    });
  });

  describe('타임스탬프 정보', () => {
    it('beforeinput과 input이 모두 있을 때 타임스탬프 델타를 표시해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 25,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 25,
      };

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [beforeInput, input]);

      const timestampInfo = container.querySelector('.cev-event-pair-timestamp');
      expect(timestampInfo).toBeTruthy();
      expect(timestampInfo?.textContent).toContain('Δ 25ms');
    });

    it('beforeinput만 있을 때 적절한 메시지를 표시해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const pair: EventPair = {
        beforeInput,
        input: null,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [beforeInput]);

      const timestampInfo = container.querySelector('.cev-event-pair-timestamp');
      expect(timestampInfo?.textContent).toContain('BeforeInput only');
    });

    it('input만 있을 때 적절한 메시지를 표시해야 함', () => {
      const baseTime = 1000;
      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput: null,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [input]);

      const timestampInfo = container.querySelector('.cev-event-pair-timestamp');
      expect(timestampInfo?.textContent).toContain('Input only');
    });
  });

  describe('에러 처리', () => {
    it('플러그인에서 에러가 발생해도 계속 동작해야 함', () => {
      const baseTime = 1000;
      const beforeInput: EventLog = {
        id: 1,
        type: 'beforeinput',
        timestamp: baseTime,
        inputType: 'insertText',
        data: 'a',
        startOffset: 0,
        endOffset: 0,
      };

      const input: EventLog = {
        id: 2,
        type: 'input',
        timestamp: baseTime + 10,
        inputType: 'insertText',
        data: 'a',
        startOffset: 1,
        endOffset: 1,
      };

      const pair: EventPair = {
        beforeInput,
        input,
        eventKey: 'test-key',
        inputTypeMismatch: false,
        timestampDelta: 10,
      };

      // 플러그인에서 에러 발생 시뮬레이션
      vi.mocked(mockPlugin.getEvents).mockImplementation(() => {
        throw new Error('Plugin error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const viewer = new EventPairHistoryViewer(container, plugins);
      viewer.update([pair], new Map(), [beforeInput, input]);

      // 에러가 발생해도 블록은 생성되어야 함
      const blocks = container.querySelectorAll('.cev-event-pair-history-block');
      expect(blocks.length).toBe(1);

      // 경고가 출력되어야 함
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
