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
  } = snapshot;

  const triggerDescriptions: Record<string, string> = {
    'manual': 'Manual capture',
    'auto': 'Auto capture (on input event)',
    'missing-beforeinput': 'beforeinput event missing',
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
    '',
  ];

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
    '',
    '### 4. Problem Diagnosis',
    '- Analyze root causes if abnormal behavior exists',
    '- Mismatch points between browser behavior and expected behavior',
    '- Areas in editor implementation that need improvement',
    '',
    '### 5. Solution Proposal',
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
