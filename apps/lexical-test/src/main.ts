import { createVisualizer } from 'contenteditable-visualizer';

// Note: Lexical requires React, but for testing purposes we'll use a simple contenteditable
// In a real Lexical setup, you would attach the visualizer to Lexical's editor DOM element

const editorElement = document.getElementById('editor') as HTMLElement;
if (!editorElement) {
  throw new Error('Editor element not found');
}

const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
  autoSnapshot: false,
});

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
    const json = JSON.stringify(data, null, 2);
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

console.log('Lexical Visualizer initialized (simplified version)');

