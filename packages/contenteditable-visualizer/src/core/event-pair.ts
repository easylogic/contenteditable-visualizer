import type { EventLog } from './event-logger';

/**
 * beforeinput과 input 이벤트 쌍
 */
export interface EventPair {
  beforeInput: EventLog | null;
  input: EventLog | null;
  eventKey: string;
  inputTypeMismatch: boolean;
  timestampDelta: number;
}

/**
 * 이벤트 키 생성 함수
 * beforeinput과 input을 고유하게 식별하는 키를 생성합니다.
 */
export function createEventKey(
  beforeInput: EventLog | null,
  input: EventLog | null
): string {
  if (!beforeInput && !input) return '';
  
  const biTime = beforeInput?.timestamp ?? 0;
  const inTime = input?.timestamp ?? 0;
  const biType = beforeInput?.inputType ?? '';
  const inType = input?.inputType ?? '';
  const biData = beforeInput?.data ?? '';
  const inData = input?.data ?? '';
  
  // timestamp, inputType, data를 조합하여 고유 키 생성
  return `${biTime}_${inTime}_${biType}_${inType}_${biData}_${inData}`;
}

/**
 * 이벤트 로그 배열에서 beforeinput/input 쌍을 추출합니다.
 * 
 * @param allLogs - 모든 이벤트 로그
 * @returns 이벤트 쌍 배열
 */
export function extractEventPairs(allLogs: EventLog[]): EventPair[] {
  const pairs: EventPair[] = [];
  const PAIR_TIME_THRESHOLD_MS = 200; // beforeinput과 input 사이 최대 시간 차이
  
  for (let i = 0; i < allLogs.length; i++) {
    const log = allLogs[i];
    
    if (log.type === 'beforeinput') {
      // 가장 가까운 input 이벤트 찾기
      let matchedInput: EventLog | null = null;
      let minDelta = Infinity;
      
      for (let j = i + 1; j < allLogs.length; j++) {
        const nextLog = allLogs[j];
        if (nextLog.type === 'input') {
          const delta = nextLog.timestamp - log.timestamp;
          if (delta >= 0 && delta < PAIR_TIME_THRESHOLD_MS && delta < minDelta) {
            matchedInput = nextLog;
            minDelta = delta;
          }
        }
        // 너무 멀어지면 중단
        if (nextLog.timestamp - log.timestamp > PAIR_TIME_THRESHOLD_MS) {
          break;
        }
      }
      
      const eventKey = createEventKey(log, matchedInput);
      const inputTypeMismatch = 
        log.inputType !== matchedInput?.inputType;
      
      pairs.push({
        beforeInput: log,
        input: matchedInput,
        eventKey,
        inputTypeMismatch,
        timestampDelta: matchedInput ? minDelta : -1,
      });
    } else if (log.type === 'input') {
      // beforeinput 없이 input만 있는 경우도 처리
      // 이전에 이미 매칭된 beforeinput이 있는지 확인
      const alreadyMatched = pairs.some(pair => pair.input === log);
      if (!alreadyMatched) {
        // 가장 가까운 beforeinput 찾기 (역방향 검색)
        let matchedBeforeInput: EventLog | null = null;
        let minDelta = Infinity;
        
        for (let j = i - 1; j >= 0; j--) {
          const prevLog = allLogs[j];
          if (prevLog.type === 'beforeinput') {
            const delta = log.timestamp - prevLog.timestamp;
            if (delta >= 0 && delta < PAIR_TIME_THRESHOLD_MS && delta < minDelta) {
              // 이미 다른 input과 매칭되었는지 확인
              const alreadyPaired = pairs.some(pair => pair.beforeInput === prevLog);
              if (!alreadyPaired) {
                matchedBeforeInput = prevLog;
                minDelta = delta;
              }
            }
          }
          // 너무 멀어지면 중단
          if (log.timestamp - prevLog.timestamp > PAIR_TIME_THRESHOLD_MS) {
            break;
          }
        }
        
        const eventKey = createEventKey(matchedBeforeInput, log);
        const inputTypeMismatch = 
          matchedBeforeInput?.inputType !== log.inputType;
        
        pairs.push({
          beforeInput: matchedBeforeInput,
          input: log,
          eventKey,
          inputTypeMismatch,
          timestampDelta: matchedBeforeInput ? minDelta : -1,
        });
      }
    }
  }
  
  return pairs;
}
