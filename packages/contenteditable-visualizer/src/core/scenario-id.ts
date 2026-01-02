/**
 * 시나리오 조건 타입
 */
export type ScenarioCondition =
  | "input-type-mismatch"    // beforeinput과 input의 inputType 불일치
  | "parent-mismatch"         // beforeinput과 input의 parent 불일치
  | "node-mismatch"           // beforeinput과 input의 node 불일치
  | "selection-mismatch"      // selection이 예상과 다름
  | "missing-beforeinput"     // input은 있지만 beforeinput이 없음
  | "missing-input"           // beforeinput은 있지만 input이 없음
  | "boundary-input"          // 인라인 요소 경계에서 입력
  | "full-selection"          // 전체 선택 후 입력
  | "range-inconsistency"    // Range 일관성 문제 (beforeinput과 input의 Range 불일치)
  | "range-dom-mismatch"     // Range 위치와 DOM 변경 불일치
  | "unexpected-sequence";   // 예상치 못한 이벤트 시퀀스

/**
 * 조건별 기본 ID 매핑
 */
const CONDITION_BASE_ID: Record<ScenarioCondition, number> = {
  "input-type-mismatch": 1,
  "parent-mismatch": 2,
  "node-mismatch": 3,
  "selection-mismatch": 4,
  "missing-beforeinput": 5,
  "missing-input": 6,
  "boundary-input": 7,
  "full-selection": 8,
  "range-inconsistency": 9,
  "range-dom-mismatch": 10,
  "unexpected-sequence": 11,
};

/**
 * 시나리오 ID 생성기
 * 조건 조합에 따라 계층적 숫자 ID를 생성합니다.
 * 예: "1.2.3" = input-type-mismatch + parent-mismatch + node-mismatch
 */
export class ScenarioIdGenerator {
  /**
   * 조건 배열로부터 시나리오 ID 생성
   * 
   * @param conditions 감지된 조건들 (우선순위 순서)
   * @returns 시나리오 ID (예: "1.2.3")
   */
  static generate(conditions: ScenarioCondition[]): string {
    if (conditions.length === 0) {
      return "0"; // 정상 케이스
    }

    // 조건을 우선순위 순서로 정렬 (base ID 기준)
    const sortedConditions = [...conditions].sort((a, b) => {
      return CONDITION_BASE_ID[a] - CONDITION_BASE_ID[b];
    });

    // 계층적 ID 생성
    return sortedConditions.map(condition => CONDITION_BASE_ID[condition]).join(".");
  }

  /**
   * 시나리오 ID를 조건 배열로 변환
   * 
   * @param scenarioId 시나리오 ID (예: "1.2.3")
   * @returns 조건 배열
   */
  static parse(scenarioId: string): ScenarioCondition[] {
    if (scenarioId === "0") {
      return [];
    }

    const ids = scenarioId.split(".").map(Number);
    const conditions: ScenarioCondition[] = [];

    // ID를 조건으로 역변환
    for (const id of ids) {
      const condition = Object.entries(CONDITION_BASE_ID).find(
        ([, baseId]) => baseId === id
      )?.[0] as ScenarioCondition | undefined;

      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions;
  }

  /**
   * 시나리오 ID 설명 생성
   * 
   * @param scenarioId 시나리오 ID
   * @returns 설명 텍스트
   */
  static getDescription(scenarioId: string): string {
    const conditions = this.parse(scenarioId);

    if (conditions.length === 0) {
      return "정상 입력";
    }

    const descriptions: Record<ScenarioCondition, string> = {
      "input-type-mismatch": "InputType 불일치",
      "parent-mismatch": "Parent Mismatch",
      "node-mismatch": "Node Mismatch",
      "selection-mismatch": "Selection Mismatch",
      "missing-beforeinput": "Missing beforeinput",
      "missing-input": "Missing input",
      "boundary-input": "경계 입력",
      "full-selection": "전체 선택",
      "range-inconsistency": "Range 일관성 문제",
      "range-dom-mismatch": "Range-DOM 불일치",
      "unexpected-sequence": "예상치 못한 시퀀스",
    };

    return conditions.map(c => descriptions[c]).join(" + ");
  }
}
