import type { EventLog } from './event-logger';
import type { EventPair } from './event-pair';
import type { SnapshotTrigger } from './snapshot-manager';
import { ScenarioIdGenerator, type ScenarioCondition } from './scenario-id';

// Re-export for convenience
export type { ScenarioCondition } from './scenario-id';

/**
 * 정상적인 이벤트 시퀀스 패턴
 */
type EventSequencePattern = {
  name: string;
  events: Array<'selectionchange' | 'compositionstart' | 'compositionupdate' | 'compositionend' | 'beforeinput' | 'input'>;
  description: string;
};

const NORMAL_SEQUENCE_PATTERNS: EventSequencePattern[] = [
  {
    name: 'simple-input',
    events: ['beforeinput', 'input'],
    description: 'Simple input without composition',
  },
  {
    name: 'input-with-selection',
    events: ['selectionchange', 'beforeinput', 'input'],
    description: 'Input after selection change',
  },
  {
    name: 'ime-composition',
    events: ['compositionstart', 'compositionupdate', 'beforeinput', 'input', 'compositionend'],
    description: 'IME composition input',
  },
  {
    name: 'ime-with-selection',
    events: ['selectionchange', 'compositionstart', 'compositionupdate', 'beforeinput', 'input', 'compositionend'],
    description: 'IME composition with selection change',
  },
];

/**
 * 인라인 요소 목록 (경계 감지용)
 */
const INLINE_ELEMENTS = new Set([
  "a", "abbr", "b", "bdo", "cite", "code", "dfn", "em", "i", "kbd",
  "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup",
  "time", "u", "var",
]);

/**
 * 이전 selection 상태 정보
 */
export interface PreviousSelection {
  parentId: string;
  offset: number;
  endOffset: number;
  timestamp: number;
  textLength?: number;
  textIndex?: number;
  textPreview?: string;
  textNodeId?: string;
}

/**
 * 비정상 감지 결과
 */
export interface AbnormalDetection {
  isAbnormal: boolean;
  trigger?: SnapshotTrigger;
  detail: string;
  scenarioId?: string;
  scenarioDescription?: string;
}

/**
 * 비정상 감지기
 * beforeinput과 input 이벤트 쌍을 분석하여 비정상 상황을 감지합니다.
 */
export class AbnormalDetector {
  /**
   * 이벤트 쌍을 분석하여 비정상 상황을 감지합니다.
   * 
   * @param eventPair - beforeinput/input 이벤트 쌍
   * @param previousState - 이전 selection 상태 (선택적)
   * @param recentEvents - 최근 이벤트 로그들 (시퀀스 패턴 분석용, 선택적)
   * @returns 비정상 감지 결과
   */
  detectAbnormal(
    eventPair: EventPair,
    previousState?: {
      lastInputSelection?: PreviousSelection;
      lastBeforeInputSelection?: PreviousSelection;
    },
    recentEvents?: EventLog[]
  ): AbnormalDetection {
    const conditions: ScenarioCondition[] = [];
    const { beforeInput, input, inputTypeMismatch } = eventPair;

    // 1. inputType 불일치 감지
    if (inputTypeMismatch) {
      conditions.push("input-type-mismatch");
    }

    // 2. parent mismatch 감지
    if (beforeInput && input) {
      const biParentId = beforeInput.parent?.id || '';
      const inParentId = input.parent?.id || '';
      if (biParentId && inParentId && biParentId !== inParentId) {
        conditions.push("parent-mismatch");
      }
    }

    // 3. node mismatch 감지
    if (beforeInput && input) {
      const biNodeName = beforeInput.node?.nodeName || '';
      const inNodeName = input.node?.nodeName || '';
      if (biNodeName && inNodeName && biNodeName !== inNodeName) {
        conditions.push("node-mismatch");
      }
    }

    // 4. missing 이벤트 감지
    if (!beforeInput && input) {
      conditions.push("missing-beforeinput");
    }
    if (beforeInput && !input) {
      conditions.push("missing-input");
    }

    // 5. boundary input 감지
    if (beforeInput || input) {
      const log = beforeInput || input;
      if (log && this.detectBoundaryInput(log)) {
        conditions.push("boundary-input");
      }
    }

    // 6. full selection 감지
    if (beforeInput?.range && !beforeInput.range.collapsed) {
      conditions.push("full-selection");
    }

    // 7. selection mismatch 감지 (이전 상태와 비교)
    if (previousState?.lastInputSelection && input) {
      const lastSel = previousState.lastInputSelection;
      const currentParentId = input.parent?.id || '';
      const currentOffset = input.startOffset;
      
      // parent가 같고 offset이 크게 변한 경우 (selection jump)
      if (lastSel.parentId === currentParentId) {
        const offsetDiff = Math.abs(currentOffset - lastSel.offset);
        if (offsetDiff > 10) { // 임계값: 10자 이상 차이
          conditions.push("selection-mismatch");
        }
      }
    }

    // 8. Range 일관성 검사 (beforeinput과 input의 Range 비교)
    if (beforeInput && input && beforeInput.range && input.range) {
      const biRange = beforeInput.range;
      const inRange = input.range;
      
      // Range의 offset이 예상과 다른지 확인
      // beforeinput에서 삽입된 데이터 길이만큼 offset이 증가해야 함
      const dataLength = beforeInput.data?.length || 0;
      const expectedOffset = biRange.startOffset + dataLength;
      
      // input의 startOffset이 예상과 크게 다른 경우 (5자 이상 차이)
      if (Math.abs(inRange.startOffset - expectedOffset) > 5) {
        conditions.push("range-inconsistency");
      }
    }

    // 9. Range-DOM 불일치 감지
    // input 이벤트의 Range 위치와 실제 DOM 변경 위치가 다른지 확인
    if (input && input.range && input.startContainerText) {
      const rangeOffset = input.range.startOffset;
      const textLength = input.startContainerText.length;
      
      // Range offset이 텍스트 길이를 초과하는 경우
      if (rangeOffset > textLength + 5) { // 5자 여유
        conditions.push("range-dom-mismatch");
      }
    }

    // 10. 이벤트 시퀀스 패턴 검사
    if (recentEvents && recentEvents.length > 0) {
      if (this.detectUnexpectedSequence(recentEvents)) {
        conditions.push("unexpected-sequence");
      }
    }

    // 시나리오 ID 생성
    const scenarioId = conditions.length > 0 
      ? ScenarioIdGenerator.generate(conditions)
      : "0";
    
    const isAbnormal = conditions.length > 0;
    
    // 트리거 결정 (우선순위: input-type-mismatch > parent-mismatch > 기타)
    let trigger: SnapshotTrigger | undefined;
    if (isAbnormal) {
      if (conditions.includes("input-type-mismatch")) {
        trigger = "input-type-mismatch" as SnapshotTrigger;
      } else if (conditions.includes("parent-mismatch")) {
        trigger = "parent-mismatch";
      } else if (conditions.includes("node-mismatch")) {
        trigger = "node-mismatch";
      } else if (conditions.includes("missing-beforeinput")) {
        trigger = "missing-beforeinput";
      } else if (conditions.includes("boundary-input")) {
        trigger = "boundary-input";
      } else if (conditions.includes("selection-mismatch")) {
        trigger = "selection-mismatch";
      } else {
        trigger = "abnormal" as SnapshotTrigger;
      }
    }

    return {
      isAbnormal,
      trigger,
      detail: isAbnormal 
        ? `Detected conditions: ${conditions.join(", ")}`
        : "Normal input",
      scenarioId: isAbnormal ? scenarioId : undefined,
      scenarioDescription: isAbnormal 
        ? ScenarioIdGenerator.getDescription(scenarioId)
        : undefined,
    };
  }

  /**
   * 인라인 요소 경계에서 입력하는지 감지합니다.
   * 
   * @param log - 이벤트 로그
   * @returns 경계 입력 여부
   */
  private detectBoundaryInput(log: EventLog): boolean {
    const container = log.node;
    if (!container) return false;

    // nodeName이 '#text'인 경우 텍스트 노드
    const isTextNode = container.nodeName === '#text';
    
    // 텍스트 노드인 경우 부모를 확인해야 하지만, NodeInfo에는 parent 정보가 없음
    // 대신 parent 정보를 사용
    const parent = log.parent;
    if (!parent) return false;

    // parent의 nodeName을 확인
    const parentName = parent.nodeName?.toLowerCase();
    if (!parentName || !INLINE_ELEMENTS.has(parentName)) return false;

    const offset = log.startOffset ?? 0;
    const textLength = log.startContainerText?.length ?? 0;

    // 시작 경계 (offset === 0) 또는 끝 경계 (offset === textLength)
    return offset === 0 || offset === textLength;
  }
}
