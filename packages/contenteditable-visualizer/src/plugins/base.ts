/**
 * Base plugin class for editor integrations
 */

import type { ContentEditableVisualizer } from '../index';
import type { VisualizerPlugin, PluginMetadata, PluginOptions } from './types';

/**
 * 통일된 플러그인 이벤트 인터페이스
 */
export interface PluginEvent {
  /** 이벤트 타입 (에디터별 고유) */
  type: string;
  /** 타임스탬프 (ms) - contenteditable 이벤트와 동기화 */
  timestamp: number;
  /** 관련 contenteditable 이벤트 ID (선택적) */
  relatedEventId?: number;
  /** 이벤트 데이터 (에디터별 상세 정보) */
  data: any;
}

/**
 * Base class for editor plugins
 */
export abstract class BasePlugin implements VisualizerPlugin {
  protected visualizer: ContentEditableVisualizer | null = null;
  protected editor: any = null;
  protected attached: boolean = false;
  protected options: PluginOptions;
  
  /**
   * 에디터 이벤트 저장소 (통일된 형식)
   */
  protected editorEvents: PluginEvent[] = [];
  
  /**
   * 최근 contenteditable 이벤트 버퍼 (이벤트 매칭용)
   */
  protected recentContentEditableEvents: Array<{ id: number; timestamp: number; type: string }> = [];
  protected maxRecentEvents = 50; // 최근 50개만 유지
  protected maxEditorEvents = 100; // 최근 100개만 유지

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
   * BasePlugin의 통일된 형식으로 반환
   */
  getEvents?(): PluginEvent[] {
    return this.editorEvents.slice();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.detach();
    this.editor = null;
    this.visualizer = null;
    this.editorEvents = [];
    this.recentContentEditableEvents = [];
    this.onDestroy();
  }

  /**
   * contenteditable 이벤트 발생 시 호출됨
   * 플러그인이 이 이벤트와 자신의 이벤트를 연결할 수 있음
   */
  onContentEditableEvent(eventLog: { id: number; timestamp: number; type: string }): void {
    this.recentContentEditableEvents.push(eventLog);
    
    // 오래된 이벤트 제거
    if (this.recentContentEditableEvents.length > this.maxRecentEvents) {
      this.recentContentEditableEvents.shift();
    }
  }

  /**
   * 에디터 이벤트를 저장하는 메서드
   * 각 플러그인은 이 메서드를 호출하여 이벤트를 저장
   * 
   * @param type - 이벤트 타입 (예: 'transaction', 'operation', 'command')
   * @param data - 이벤트 데이터 (에디터별 상세 정보)
   * @param timestamp - 타임스탬프 (선택적, 없으면 현재 시간 사용)
   * @returns 저장된 이벤트
   */
  protected addEditorEvent(
    type: string,
    data: any,
    timestamp?: number
  ): PluginEvent {
    // 타임스탬프는 performance.now() 사용 (더 정확한 시간 측정)
    const eventTimestamp = timestamp ?? (
      typeof performance !== 'undefined' && performance.now
        ? performance.now() + performance.timeOrigin
        : Date.now()
    );
    
    // 관련 contenteditable 이벤트 찾기
    const relatedEventId = this.findRelatedContentEditableEvent(eventTimestamp);
    
    const event: PluginEvent = {
      type,
      timestamp: eventTimestamp,
      relatedEventId,
      data,
    };
    
    this.editorEvents.push(event);
    
    // 오래된 이벤트 제거
    if (this.editorEvents.length > this.maxEditorEvents) {
      this.editorEvents.shift();
    }
    
    return event;
  }

  /**
   * 최근 contenteditable 이벤트 중 타임스탬프가 가까운 이벤트 찾기
   * @param timestamp - 찾을 타임스탬프
   * @param timeWindow - 시간 윈도우 (ms, 기본값: 50ms)
   * @returns 관련 이벤트 ID 또는 undefined
   */
  protected findRelatedContentEditableEvent(
    timestamp: number,
    timeWindow: number = 50
  ): number | undefined {
    // 최근 이벤트부터 역순으로 검색 (가장 가까운 이벤트 찾기)
    for (let i = this.recentContentEditableEvents.length - 1; i >= 0; i--) {
      const event = this.recentContentEditableEvents[i];
      const timeDiff = Math.abs(event.timestamp - timestamp);
      
      // 시간 윈도우 내의 이벤트만 고려
      if (timeDiff <= timeWindow) {
        // input 또는 beforeinput 이벤트만 매칭
        if (event.type === 'input' || event.type === 'beforeinput') {
          return event.id;
        }
      }
      
      // 시간 윈도우를 벗어나면 더 이상 찾지 않음 (시간순 정렬 가정)
      if (timeDiff > timeWindow * 2) {
        break;
      }
    }
    
    return undefined;
  }

  /**
   * 에디터 이벤트 히스토리 초기화
   */
  protected clearEditorEvents(): void {
    this.editorEvents = [];
  }

  /**
   * 최근 N개의 에디터 이벤트 가져오기
   */
  protected getRecentEditorEvents(count: number): PluginEvent[] {
    return this.editorEvents.slice(-count);
  }

  /**
   * Hook for plugin-specific cleanup
   */
  protected onDestroy(): void {
    // Override in subclasses
  }
}

