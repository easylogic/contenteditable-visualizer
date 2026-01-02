# 이벤트 히스토리 뷰어 분석 및 개선 방안

## 현재 상태 분석

### 1. 현재 구현
- `extractLastSets(sortedAll, 1)`: 마지막 1개 세트만 추출
- `floating-panel.ts`의 `updateEvents`: 마지막 beforeinput/input 쌍만 표시
- 이전 이벤트 쌍과 비교 불가능

### 2. zero-core의 접근 방식
- `extractLastSets` 함수는 `maxSets` 파라미터로 여러 세트 추출 가능
- 하지만 실제로는 마지막 1개만 표시 (`extractLastSets(sortedAll, 1)`)
- 여러 세트를 표시하는 기능은 있지만 기본적으로는 마지막 1개만 보여줌

## 문제점

1. **비교 불가능**: 현재 beforeinput/input 쌍만 보여주므로 이전 쌍과 비교 불가
2. **히스토리 부재**: 이전 입력 이벤트 쌍의 히스토리를 볼 수 없음
3. **패턴 파악 어려움**: 연속된 입력에서 발생하는 패턴을 파악하기 어려움

## 개선 방안

### 1. 이벤트 쌍 히스토리 뷰어 추가

**제안: EventPairHistoryViewer 클래스**

```typescript
export class EventPairHistoryViewer {
  private container: HTMLElement;
  private maxVisiblePairs: number = 5; // 최대 표시할 쌍 개수
  private eventPairs: EventPair[] = [];
  private abnormalDetections: Map<string, AbnormalDetection> = new Map();

  /**
   * 이벤트 쌍 히스토리 업데이트
   */
  updateHistory(allLogs: EventLog[]): void {
    // 모든 이벤트 쌍 추출
    const pairs = extractEventPairs(allLogs);
    
    // 최근 N개만 유지
    this.eventPairs = pairs.slice(-this.maxVisiblePairs);
    
    // 각 쌍에 대한 비정상 감지 수행
    const detector = new AbnormalDetector();
    this.abnormalDetections.clear();
    
    for (const pair of this.eventPairs) {
      const detection = detector.detectAbnormal(pair);
      if (detection.isAbnormal) {
        this.abnormalDetections.set(pair.eventKey, detection);
      }
    }
    
    this.render();
  }

  /**
   * 히스토리 렌더링
   */
  private render(): void {
    this.container.innerHTML = '';
    
    // 최신순으로 표시 (역순)
    const reversedPairs = [...this.eventPairs].reverse();
    
    for (let i = 0; i < reversedPairs.length; i++) {
      const pair = reversedPairs[i];
      const detection = this.abnormalDetections.get(pair.eventKey);
      
      const pairBlock = this.createPairBlock(pair, detection, i);
      this.container.appendChild(pairBlock);
    }
  }

  /**
   * 이벤트 쌍 블록 생성
   */
  private createPairBlock(
    pair: EventPair,
    detection: AbnormalDetection | undefined,
    index: number
  ): HTMLElement {
    const block = document.createElement('div');
    block.className = 'cev-event-pair-history-block';
    
    // 쌍 헤더 (인덱스, 타임스탬프, 비정상 여부)
    const header = document.createElement('div');
    header.className = 'cev-event-pair-history-header';
    
    const pairNumber = document.createElement('span');
    pairNumber.textContent = `Pair #${this.eventPairs.length - index}`;
    header.appendChild(pairNumber);
    
    if (detection?.isAbnormal) {
      const badge = document.createElement('span');
      badge.className = 'cev-event-pair-history-badge cev-event-pair-history-badge--abnormal';
      badge.textContent = `⚠️ ${detection.scenarioId || detection.trigger}`;
      header.appendChild(badge);
    }
    
    if (pair.inputTypeMismatch) {
      const mismatchBadge = document.createElement('span');
      mismatchBadge.className = 'cev-event-pair-history-badge cev-event-pair-history-badge--mismatch';
      mismatchBadge.textContent = '⚠️ InputType Mismatch';
      header.appendChild(mismatchBadge);
    }
    
    block.appendChild(header);
    
    // beforeinput 블록
    if (pair.beforeInput) {
      const beforeBlock = createPhaseBlock(
        'BEFOREINPUT',
        pair.beforeInput,
        pair.beforeInput.startContainerText || '',
        {
          timestampMs: pair.beforeInput.timestamp,
          extraClassName: 'cev-event-pair-history-phase',
        }
      );
      if (beforeBlock) {
        block.appendChild(beforeBlock);
      }
    }
    
    // input 블록
    if (pair.input) {
      const inputBlock = createPhaseBlock(
        'INPUT',
        pair.input,
        pair.input.startContainerText || '',
        {
          timestampMs: pair.input.timestamp,
          deltaMs: pair.timestampDelta,
          extraClassName: detection?.isAbnormal 
            ? 'cev-event-pair-history-phase cev-phase-block--abnormal'
            : 'cev-event-pair-history-phase',
          extraLines: detection?.isAbnormal 
            ? [`⚠️ ${detection.detail}`, detection.scenarioDescription ? `시나리오: ${detection.scenarioDescription}` : ''].filter(Boolean)
            : undefined,
        }
      );
      if (inputBlock) {
        block.appendChild(inputBlock);
      }
    }
    
    return block;
  }
}
```

### 2. FloatingPanel에 히스토리 뷰 통합

**제안: 탭 또는 섹션으로 분리**

```typescript
// floating-panel.ts
export class FloatingPanel {
  private eventPairHistoryViewer: EventPairHistoryViewer | null = null;
  
  updateEvents(events: EventLog[]): void {
    // 기존 로직: 마지막 세트 표시
    // ...
    
    // 히스토리 뷰어 업데이트
    if (this.eventPairHistoryViewer) {
      this.eventPairHistoryViewer.updateHistory(events);
    }
  }
}
```

### 3. UI 구조 개선

**제안: 두 가지 뷰 모드**

1. **현재 뷰 (기본)**: 마지막 beforeinput/input 쌍만 표시 (기존 방식)
2. **히스토리 뷰**: 최근 N개의 beforeinput/input 쌍을 세로로 나열

**레이아웃 제안:**
```
┌─────────────────────────────────────┐
│ Event Logs                          │
├─────────────────────────────────────┤
│ [Current View] [History View]  ← 탭 │
├─────────────────────────────────────┤
│                                     │
│ Current View:                       │
│ ┌─────────────────────────────────┐ │
│ │ SELECTION                       │ │
│ │ INPUT                           │ │
│ │ BEFOREINPUT                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ History View:                       │
│ ┌─────────────────────────────────┐ │
│ │ Pair #3  [⚠️ 1.2.3]            │ │
│ │   BEFOREINPUT                  │ │
│ │   INPUT                         │ │
│ ├─────────────────────────────────┤ │
│ │ Pair #2  [⚠️ InputType Mismatch]│ │
│ │   BEFOREINPUT                  │ │
│ │   INPUT                         │ │
│ ├─────────────────────────────────┤ │
│ │ Pair #1                         │ │
│ │   BEFOREINPUT                  │ │
│ │   INPUT                         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4. 이벤트 쌍 관리 개선

**제안: EventPairManager 클래스**

```typescript
export class EventPairManager {
  private pairs: EventPair[] = [];
  private maxPairs: number = 50; // 최대 보관할 쌍 개수
  
  /**
   * 새로운 이벤트 로그 추가 시 쌍 업데이트
   */
  updatePairs(allLogs: EventLog[]): EventPair[] {
    const newPairs = extractEventPairs(allLogs);
    
    // 중복 제거 (eventKey 기준)
    const existingKeys = new Set(this.pairs.map(p => p.eventKey));
    const uniqueNewPairs = newPairs.filter(p => !existingKeys.has(p.eventKey));
    
    // 새 쌍 추가
    this.pairs.push(...uniqueNewPairs);
    
    // 최대 개수 제한
    if (this.pairs.length > this.maxPairs) {
      this.pairs = this.pairs.slice(-this.maxPairs);
    }
    
    return this.pairs;
  }
  
  /**
   * 최근 N개 쌍 가져오기
   */
  getRecentPairs(count: number): EventPair[] {
    return this.pairs.slice(-count);
  }
  
  /**
   * 특정 쌍 찾기 (eventKey 기준)
   */
  findPair(eventKey: string): EventPair | undefined {
    return this.pairs.find(p => p.eventKey === eventKey);
  }
}
```

## 구현 우선순위

### Phase 1: 기본 히스토리 뷰
1. ✅ `EventPairHistoryViewer` 클래스 구현
2. ✅ `FloatingPanel`에 히스토리 뷰 통합
3. ✅ 최근 5개 쌍 표시

### Phase 2: UI 개선
1. ✅ 탭 또는 토글 버튼으로 뷰 전환
2. ✅ 스크롤 가능한 히스토리 컨테이너
3. ✅ 각 쌍에 대한 비정상 감지 배지 표시

### Phase 3: 고급 기능
1. ⏳ 쌍 필터링 (비정상만 보기, inputType 불일치만 보기 등)
2. ⏳ 쌍 검색 (eventKey, timestamp 기준)
3. ⏳ 쌍 비교 기능 (두 쌍을 나란히 비교)

## 사용 예시

```typescript
// FloatingPanel에서 자동으로 히스토리 관리
const visualizer = new ContentEditableVisualizer(element, {
  panel: true, // 히스토리 뷰 포함
});

// 수동으로 히스토리 가져오기
const pairs = extractEventPairs(visualizer.getEventLogs());
console.log('Total pairs:', pairs.length);
console.log('Recent pairs:', pairs.slice(-5));
```

## 결론

이벤트 쌍 히스토리 뷰어를 추가하여:
1. **비교 가능**: 이전 beforeinput/input 쌍과 현재 쌍을 비교
2. **패턴 파악**: 연속된 입력에서 발생하는 패턴 파악
3. **디버깅 용이**: 비정상 상황이 발생한 이전 쌍들을 함께 확인

이를 통해 contenteditable 동작을 더 정확하게 분석하고 문서화할 수 있습니다.
