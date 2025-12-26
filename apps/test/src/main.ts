import { createVisualizer } from 'contenteditable-visualizer';

const editorElement = document.getElementById('editor') as HTMLElement;
if (!editorElement) {
  throw new Error('Editor element not found');
}

// Initialize visualizer
const visualizer = createVisualizer(editorElement, {
  enableVisualization: true,
  enableEventLogging: true,
  enableSnapshots: true,
  showFloatingPanel: true,
  autoCaptureSnapshots: false,
});

// Button handlers
document.getElementById('capture-snapshot')?.addEventListener('click', async () => {
  try {
    const id = await visualizer.captureSnapshot('manual', 'User clicked capture button');
    console.log('Snapshot captured:', id);
    alert(`Snapshot captured! ID: ${id}`);
  } catch (error) {
    console.error('Failed to capture snapshot:', error);
    alert('Failed to capture snapshot');
  }
});

document.getElementById('clear-events')?.addEventListener('click', () => {
  visualizer.clearEventLogs();
  console.log('Events cleared');
  alert('Events cleared');
});

document.getElementById('clear-snapshots')?.addEventListener('click', async () => {
  try {
    await visualizer.clearSnapshots();
    console.log('Snapshots cleared');
    alert('Snapshots cleared');
  } catch (error) {
    console.error('Failed to clear snapshots:', error);
    alert('Failed to clear snapshots');
  }
});

document.getElementById('export-data')?.addEventListener('click', async () => {
  try {
    const data = await visualizer.exportData();
    const json = JSON.stringify(data, null, 2);
    console.log('Exported data:', data);
    
    // Download as JSON file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contenteditable-visualizer-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('Data exported! Check your downloads.');
  } catch (error) {
    console.error('Failed to export data:', error);
    alert('Failed to export data');
  }
});

let visualizationEnabled = true;
document.getElementById('toggle-visualization')?.addEventListener('click', () => {
  visualizationEnabled = !visualizationEnabled;
  visualizer.showVisualization(visualizationEnabled);
  const button = document.getElementById('toggle-visualization');
  if (button) {
    button.textContent = visualizationEnabled ? 'Disable Visualization' : 'Enable Visualization';
  }
  console.log('Visualization:', visualizationEnabled ? 'enabled' : 'disabled');
});

// Listen to snapshot selection events
document.addEventListener('cev-snapshot-selected', ((e: CustomEvent) => {
  console.log('Snapshot selected:', e.detail);
  alert(`Snapshot selected: ${e.detail.trigger || 'unknown'} at ${new Date(e.detail.timestamp).toLocaleString()}`);
}) as EventListener);

// Log events to console
visualizer.onEvent((log) => {
  console.log('Event logged:', log);
});

console.log('ContentEditable Visualizer initialized');

