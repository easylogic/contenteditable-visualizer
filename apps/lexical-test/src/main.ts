import { createVisualizer } from 'contenteditable-visualizer';
import { LexicalPlugin } from '@contenteditable/lexical';
import { createEditor } from 'lexical';

const editorElement = document.getElementById('editor') as HTMLElement;
if (!editorElement) {
  throw new Error('Editor element not found');
}

// Create Lexical editor instance
const lexicalEditor = createEditor({
  namespace: 'LexicalTest',
  nodes: [],
  onError: (error) => {
    console.error('Lexical error:', error);
  },
});

// Set the editor element
lexicalEditor.setRootElement(editorElement);

// Initialize visualizer on Lexical's DOM
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
  autoSnapshot: false,
  container: document.body,
});

// Register Lexical plugin
const lexicalPlugin = new LexicalPlugin({
  config: {
    trackUpdates: true,
    trackSelection: true,
    trackDocument: true,
    trackCommands: true,
    trackHistory: true,
    trackFormatting: true,
    maxUpdateHistory: 100,
  },
});

visualizer.registerPlugin(lexicalPlugin, lexicalEditor);

console.log('Lexical Plugin registered:', lexicalPlugin.metadata.name);

document.getElementById('capture-snapshot')?.addEventListener('click', async () => {
  try {
    const id = await visualizer.captureSnapshot('manual', 'Lexical snapshot');
    console.log('Snapshot captured:', id);
    alert(`Snapshot captured! ID: ${id}`);
  } catch (error) {
    console.error('Failed to capture snapshot:', error);
  }
});

document.getElementById('clear-events')?.addEventListener('click', () => {
  visualizer.clearEventLogs();
  console.log('Events cleared');
});

document.getElementById('export-data')?.addEventListener('click', async () => {
  try {
    const data = await visualizer.exportData();
    
    // Include Lexical plugin state
    const lexicalState = lexicalPlugin.getState();
    const lexicalEvents = lexicalPlugin.getEvents();
    
    const exportData = {
      ...data,
      lexical: {
        state: lexicalState,
        events: lexicalEvents,
      },
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexical-visualizer-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
  }
});

// Add button to show Lexical plugin state
const showPluginStateBtn = document.createElement('button');
showPluginStateBtn.textContent = 'Show Lexical State';
showPluginStateBtn.style.margin = '10px';
showPluginStateBtn.addEventListener('click', () => {
  const state = lexicalPlugin.getState();
  const events = lexicalPlugin.getEvents();
  console.log('Lexical State:', state);
  console.log('Lexical Events:', events);
  console.log(`Total updates: ${events.length}`);
  if (events.length > 0) {
    console.log('Last update:', events[events.length - 1]);
  }
  
  // Show in alert for quick check
  alert(`Lexical Plugin Status:\n- Total Events: ${events.length}\n- Plugin Attached: ${lexicalPlugin ? 'Yes' : 'No'}\n- Editor Available: ${lexicalEditor ? 'Yes' : 'No'}`);
});
document.body.appendChild(showPluginStateBtn);

// Add plugin status indicator
const statusIndicator = document.createElement('div');
statusIndicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #10b981;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10000;
`;
statusIndicator.textContent = '✓ Lexical Plugin Active';
document.body.appendChild(statusIndicator);

console.log('Lexical Visualizer initialized with plugin');

