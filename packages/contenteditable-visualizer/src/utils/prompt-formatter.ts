/**
 * AI Prompt Formatter
 * Converts snapshot data into AI analysis prompts.
 */

import type { Snapshot } from '../core/snapshot-manager';
import type { EventLog } from '../core/event-logger';

/**
 * Formats HTML for prompt (simple indentation)
 */
function formatHtmlForPrompt(html: string): string {
  if (!html) return '(Empty HTML)';
  // Simple formatting: add line break when > is followed by <
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Formats event logs for prompt
 */
function formatEventLogsForPrompt(eventLogs: EventLog[]): string {
  if (!eventLogs || eventLogs.length === 0) {
    return '(No event logs)';
  }

  const lines: string[] = [];
  
  for (const log of eventLogs) {
    const timeStr = new Date(log.timestamp).toISOString();
    const eventType = log.type;
    
    lines.push(`[${eventType}] ${timeStr}`);
    
    if (log.range) {
      lines.push(`  range: ${log.range.collapsed ? 'collapsed' : `start:${log.range.startOffset}, end:${log.range.endOffset}`}`);
    }
    
    if (log.inputType) {
      lines.push(`  inputType: ${log.inputType}`);
    }
    
    if (log.data !== undefined) {
      lines.push(`  data: ${log.data || '(null)'}`);
    }
    
    if (log.isComposing !== undefined) {
      lines.push(`  isComposing: ${log.isComposing}`);
    }
    
    if (log.startOffset !== undefined) {
      lines.push(`  startOffset: ${log.startOffset}`);
    }
    
    if (log.endOffset !== undefined) {
      lines.push(`  endOffset: ${log.endOffset}`);
    }
    
    if (log.targetRanges && log.targetRanges.length > 0) {
      lines.push(`  targetRanges: ${log.targetRanges.length} range(s)`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Formats DOM change results for prompt
 */
function formatDomChangesForPrompt(domChangeResult?: Snapshot['domChangeResult']): string {
  if (!domChangeResult) {
    return '(No DOM change information)';
  }

  const lines: string[] = [];
  
  if (domChangeResult.deletedRects && domChangeResult.deletedRects.length > 0) {
    lines.push(`Deleted areas: ${domChangeResult.deletedRects.length} area(s)`);
    domChangeResult.deletedRects.forEach((rect: any, i: number) => {
      lines.push(`  [${i + 1}] Position: (${rect.left}, ${rect.top}), Size: ${rect.width}x${rect.height}`);
    });
    lines.push('');
  }
  
  if (domChangeResult.addedRects && domChangeResult.addedRects.length > 0) {
    lines.push(`Added areas: ${domChangeResult.addedRects.length} area(s)`);
    domChangeResult.addedRects.forEach((rect: any, i: number) => {
      lines.push(`  [${i + 1}] Position: (${rect.left}, ${rect.top}), Size: ${rect.width}x${rect.height}`);
    });
    lines.push('');
  }
  
  if (domChangeResult.modifiedNodes && domChangeResult.modifiedNodes.length > 0) {
    lines.push(`Modified nodes: ${domChangeResult.modifiedNodes.length} node(s)`);
    domChangeResult.modifiedNodes.forEach((node: any, i: number) => {
      lines.push(`  [${i + 1}] Type: ${node.changeType}`);
      if (node.before) {
        lines.push(`    Before: "${node.before.text?.substring(0, 50) || ''}"`);
      }
      if (node.after) {
        lines.push(`    After: "${node.after.text?.substring(0, 50) || ''}"`);
      }
    });
    lines.push('');
  }
  
  return lines.join('\n') || '(No changes)';
}

/**
 * Formats range information for prompt
 */
function formatRangesForPrompt(ranges?: Snapshot['ranges']): string {
  if (!ranges) {
    return '(No range information)';
  }

  const lines: string[] = [];
  
  if (ranges.sel) {
    const sel = ranges.sel;
    lines.push(`Selection Range:`);
    lines.push(`  collapsed: ${sel.collapsed}`);
    lines.push(`  startContainer: ${sel.startContainer}`);
    lines.push(`  startOffset: ${sel.startOffset}`);
    if (!sel.collapsed) {
      lines.push(`  endContainer: ${sel.endContainer}`);
      lines.push(`  endOffset: ${sel.endOffset}`);
    }
    lines.push('');
  }
  
  if (ranges.comp) {
    lines.push(`Composition Range:`, JSON.stringify(ranges.comp, null, 2));
    lines.push('');
  }
  
  if (ranges.bi) {
    lines.push(`BeforeInput Range:`, JSON.stringify(ranges.bi, null, 2));
    lines.push('');
  }
  
  if (ranges.input) {
    lines.push(`Input Range:`, JSON.stringify(ranges.input, null, 2));
    lines.push('');
  }
  
  return lines.join('\n') || '(No range information)';
}

/**
 * Formats event pairs for prompt
 */
function formatEventPairsForPrompt(eventPairs?: Snapshot['eventPairs']): string {
  if (!eventPairs || eventPairs.length === 0) {
    return '(No event pairs)';
  }

  const lines: string[] = [];
  
  for (let i = 0; i < eventPairs.length; i++) {
    const pair = eventPairs[i];
    lines.push(`Event Pair #${i + 1}:`);
    
    if (pair.beforeInput) {
      const bi = pair.beforeInput;
      lines.push(`  BeforeInput:`);
      lines.push(`    timestamp: ${new Date(bi.timestamp).toISOString()}`);
      lines.push(`    inputType: ${bi.inputType || '(none)'}`);
      lines.push(`    data: ${bi.data || '(null)'}`);
      if (bi.parent) {
        lines.push(`    parent: ${bi.parent.nodeName}@${bi.parent.id}`);
      }
      if (bi.node) {
        lines.push(`    node: ${bi.node.nodeName}@${bi.node.id}`);
      }
      if (bi.startOffset !== undefined) {
        lines.push(`    offset: start=${bi.startOffset}, end=${bi.endOffset || bi.startOffset}`);
      }
    } else {
      lines.push(`  BeforeInput: (missing)`);
    }
    
    if (pair.input) {
      const input = pair.input;
      lines.push(`  Input:`);
      lines.push(`    timestamp: ${new Date(input.timestamp).toISOString()}`);
      lines.push(`    inputType: ${input.inputType || '(none)'}`);
      lines.push(`    data: ${input.data || '(null)'}`);
      if (input.parent) {
        lines.push(`    parent: ${input.parent.nodeName}@${input.parent.id}`);
      }
      if (input.node) {
        lines.push(`    node: ${input.node.nodeName}@${input.node.id}`);
      }
      if (input.startOffset !== undefined) {
        lines.push(`    offset: start=${input.startOffset}, end=${input.endOffset || input.startOffset}`);
      }
    } else {
      lines.push(`  Input: (missing)`);
    }
    
    lines.push(`  inputTypeMismatch: ${pair.inputTypeMismatch}`);
    lines.push(`  timestampDelta: ${pair.timestampDelta}ms`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Formats abnormal detections for prompt
 */
function formatAbnormalDetectionsForPrompt(abnormalDetections?: Snapshot['abnormalDetections']): string {
  if (!abnormalDetections || abnormalDetections.length === 0) {
    return '(No abnormal detections)';
  }

  const lines: string[] = [];
  
  for (let i = 0; i < abnormalDetections.length; i++) {
    const ad = abnormalDetections[i];
    const detection = ad.detection;
    
    lines.push(`Abnormal Detection #${i + 1}:`);
    lines.push(`  isAbnormal: ${detection.isAbnormal}`);
    
    if (detection.isAbnormal) {
      if (detection.trigger) {
        lines.push(`  trigger: ${detection.trigger}`);
      }
      lines.push(`  detail: ${detection.detail}`);
      if (detection.scenarioId) {
        lines.push(`  scenarioId: ${detection.scenarioId}`);
      }
      if (detection.scenarioDescription) {
        lines.push(`  scenarioDescription: ${detection.scenarioDescription}`);
      }
      
      // Event pair summary
      const pair = ad.eventPair;
      if (pair.beforeInput || pair.input) {
        lines.push(`  eventPair:`);
        if (pair.beforeInput) {
          lines.push(`    beforeInput: ${pair.beforeInput.inputType || '(none)'} at ${new Date(pair.beforeInput.timestamp).toISOString()}`);
        }
        if (pair.input) {
          lines.push(`    input: ${pair.input.inputType || '(none)'} at ${new Date(pair.input.timestamp).toISOString()}`);
        }
        lines.push(`    inputTypeMismatch: ${pair.inputTypeMismatch}`);
      }
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generates AI analysis prompt
 */
export function buildAiPrompt(snapshot: Snapshot): string {
  const {
    trigger,
    triggerDetail,
    environment,
    eventLogs,
    domBefore,
    domAfter,
    ranges,
    domChangeResult,
    eventPairs,
    abnormalDetections,
    scenarioId,
    scenarioDescription,
  } = snapshot;

  const triggerDescriptions: Record<string, string> = {
    'manual': 'Manual capture',
    'auto': 'Auto capture (on input event)',
    'missing-beforeinput': 'beforeinput event missing',
    'input-type-mismatch': 'beforeinput and input have different inputType values',
    'parent-mismatch': 'beforeinput and input have different parent elements',
    'node-mismatch': 'beforeinput and input have different node elements',
    'selection-mismatch': 'Selection changed unexpectedly between beforeinput and input',
    'boundary-input': 'Input occurred at element boundary',
    'full-selection': 'Input occurred with full text selection',
    'range-inconsistency': 'Range inconsistency detected between beforeinput and input',
    'range-dom-mismatch': 'Range position does not match DOM changes',
    'unexpected-sequence': 'Unexpected event sequence pattern detected',
    'abnormal': 'Abnormal input behavior detected',
  };

  const lines: string[] = [
    '# ContentEditable Event Analysis Request',
    '',
    '## Environment Information',
    `- OS: ${environment.os} ${environment.osVersion}`,
    `- Browser: ${environment.browser} ${environment.browserVersion}`,
    `- Device: ${environment.device}`,
    `- Mobile: ${environment.isMobile ? 'Yes' : 'No'}`,
    '',
    '## Snapshot Information',
    `- **Trigger**: \`${trigger || 'unknown'}\``,
    `- **Description**: ${triggerDescriptions[trigger || ''] || trigger || 'Unknown'}`,
    `- **Detail**: ${triggerDetail || '(none)'}`,
    `- **Timestamp**: ${new Date(snapshot.timestamp).toISOString()}`,
  ];

  // Scenario information
  if (scenarioId || scenarioDescription) {
    lines.push('');
    lines.push('## Scenario Information');
    if (scenarioId) {
      lines.push(`- **Scenario ID**: \`${scenarioId}\``);
    }
    if (scenarioDescription) {
      lines.push(`- **Scenario Description**: ${scenarioDescription}`);
    }
  }

  lines.push('');

  // Event logs
  lines.push('## Event Logs', '');
  lines.push('```');
  lines.push(formatEventLogsForPrompt(eventLogs));
  lines.push('```', '');

  // Range information
  lines.push('## Range Information', '');
  lines.push('```');
  lines.push(formatRangesForPrompt(ranges));
  lines.push('```', '');

  // Event pairs
  if (eventPairs && eventPairs.length > 0) {
    lines.push('## Event Pairs (beforeinput/input pairs)', '');
    lines.push('```');
    lines.push(formatEventPairsForPrompt(eventPairs));
    lines.push('```', '');
  }

  // Abnormal detections
  if (abnormalDetections && abnormalDetections.length > 0) {
    lines.push('## Abnormal Detections', '');
    lines.push('```');
    lines.push(formatAbnormalDetectionsForPrompt(abnormalDetections));
    lines.push('```', '');
  }

  // DOM change results
  if (domChangeResult) {
    lines.push('## DOM Change Results', '');
    lines.push('```');
    lines.push(formatDomChangesForPrompt(domChangeResult));
    lines.push('```', '');
  }

  // DOM structure
  lines.push('## DOM Structure', '');
  if (domBefore) {
    lines.push('### Before (beforeinput point)', '```html', formatHtmlForPrompt(domBefore), '```', '');
  } else {
    lines.push('### Before (beforeinput point)', '```', '(Not captured)', '```', '');
  }
  lines.push('### After (current state)', '```html', formatHtmlForPrompt(domAfter), '```', '');

  // Analysis request
  lines.push(
    '## Analysis Request',
    '',
    '### 1. Event Flow Analysis',
    '- Analyze event occurrence order and time intervals',
    '- Relationship between Selection, Composition, BeforeInput, and Input events',
    '- Track Range position changes between events',
    '',
    '### 2. DOM Change Analysis',
    '- Track Before DOM → After DOM changes',
    '- Text node addition/deletion/modification patterns',
    '- Timing and content of browser DOM changes',
    '',
    '### 3. Range Analysis',
    '- Compare Ranges at each point: Selection, Composition, BeforeInput, Input',
    '- Range position changes (offset, container)',
    '- Consistency between Range and actual DOM changes',
    '- Check for range-inconsistency: beforeinput and input Range offset mismatches',
    '- Check for range-dom-mismatch: Range position vs actual DOM change position',
    '',
    '### 4. Event Pair Analysis',
    '- Analyze beforeinput/input event pairs',
    '- Check for inputType mismatches between beforeinput and input',
    '- Identify missing beforeinput or input events',
    '- Analyze timestamp deltas between paired events',
    '- Check Range consistency between beforeinput and input',
    '',
    '### 5. Abnormal Detection Analysis',
    '- Review detected abnormal scenarios (if any)',
    '- Understand scenario IDs and their meanings',
    '- Analyze root causes of abnormal behaviors',
    '- Check for parent/node mismatches, selection jumps, boundary inputs, etc.',
    '- Analyze range consistency issues (range-inconsistency, range-dom-mismatch)',
    '- Review event sequence patterns (unexpected-sequence)',
    '',
    '### 6. Problem Diagnosis',
    '- Analyze root causes if abnormal behavior exists',
    '- Mismatch points between browser behavior and expected behavior',
    '- Areas in editor implementation that need improvement',
    '',
    '### 7. Solution Proposal',
    '- Propose specific solutions',
    '- Code-level improvement suggestions (if possible)',
    '- Consider browser-specific issues',
    '',
    '## Notes',
    '',
    '### Terminology',
    '- **Selection Range**: Text range selected by the user',
    '- **Composition Range**: Range during IME input (Japanese, Chinese, Korean, etc.)',
    '- **BeforeInput Range**: Range at beforeinput event point',
    '- **Input Range**: Range at input event point',
    '- **DOM Change Result**: Text node level change tracking results',
    '',
    '### Event Sequence',
    'Typical input event flow:',
    '1. `selectionchange` - Selection area change',
    '2. `compositionstart` (for IME input) - IME input start',
    '3. `compositionupdate` (for IME input) - IME input update',
    '4. `beforeinput` - Before input (before browser DOM change)',
    '5. `input` - After input (after browser DOM change)',
    '6. `compositionend` (for IME input) - IME input end',
    '',
  );

  return lines.join('\n');
}
