import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { createVisualizer } from 'contenteditable-visualizer';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Start typing here to see the visualizer in action!' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'Try selecting text, using keyboard shortcuts, or IME composition.' }],
  },
];

function App() {
  const [editor] = useState(() => withReact(createEditor()));
  const editorRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<ReturnType<typeof createVisualizer> | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      const editorElement = editorRef.current.querySelector('[data-slate-editor]') as HTMLElement;
      if (editorElement && !visualizerRef.current) {
        visualizerRef.current = createVisualizer(editorElement, {
          visualize: true,
          logEvents: true,
          snapshots: true,
          panel: true,
          autoSnapshot: false,
        });
      }
    }
  }, []);

  const handleCaptureSnapshot = async () => {
    if (visualizerRef.current) {
      try {
        const id = await visualizerRef.current.captureSnapshot('manual', 'Slate.js snapshot');
        console.log('Snapshot captured:', id);
        alert(`Snapshot captured! ID: ${id}`);
      } catch (error) {
        console.error('Failed to capture snapshot:', error);
      }
    }
  };

  const handleClearEvents = () => {
    if (visualizerRef.current) {
      visualizerRef.current.clearEventLogs();
      console.log('Events cleared');
    }
  };

  const handleExportData = async () => {
    if (visualizerRef.current) {
      try {
        const data = await visualizerRef.current.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slatejs-visualizer-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to export data:', error);
      }
    }
  };

  return (
    <>
      <div className="controls">
        <button className="primary" onClick={handleCaptureSnapshot}>Capture Snapshot</button>
        <button onClick={handleClearEvents}>Clear Events</button>
        <button onClick={handleExportData}>Export Data</button>
      </div>
      <div className="editor-container" ref={editorRef}>
        <Slate editor={editor} initialValue={initialValue}>
          <Editable placeholder="Enter some text..." />
        </Slate>
      </div>
    </>
  );
}

// Note: Slate.js requires React, but we'll use a simpler approach without React
// For now, let's create a simpler version without React dependency

const editorElement = document.getElementById('editor');
if (!editorElement) {
  throw new Error('Editor element not found');
}

// Simple Slate.js setup without React
editorElement.setAttribute('contenteditable', 'true');
editorElement.innerHTML = `
  <p>Start typing here to see the visualizer in action! 🎉</p>
  <p>Try selecting text, using keyboard shortcuts, or IME composition.</p>
  <p>Special characters: © ® ™ € £ ¥ § ¶ † ‡ • … — – "quotes" 'apostrophes'</p>
  <p>Emojis: 😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎</p>
  <p>Line breaks and whitespace:<br>Line 1<br>Line 2<br>Line 3</p>
  <p>Non-breaking space: Hello&nbsp;World&nbsp;Test</p>
  <p>Tab character: Start→→→End</p>
  <p>Regular spaces: Hello World Test Multiple&nbsp;&nbsp;&nbsp;Spaces</p>
  <p>Zero-width characters: Hello&#8203;&#8204;&#8205;World&#65279;</p>
  <p>Mixed content: <strong>Bold</strong> and <em>italic</em> and <u>underline</u></p>
  <p>Non-editable content: <span contenteditable="false" style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">This is not editable</span> but this is editable.</p>
  <p>More non-editable: <span contenteditable="false" style="color: red;">🔒 Locked</span> content here.</p>
  <p>Unicode: 中文 日本語 한국어 العربية русский</p>
  <p>Math symbols: ∑ ∫ √ ∞ ≈ ≠ ≤ ≥ ± × ÷</p>
  <p>Empty paragraphs:</p>
  <p></p>
  <p>Whitespace only:     </p>
`;

// Add invisible characters directly to text nodes after DOM is ready
setTimeout(() => {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    editorElement,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  // Add various invisible characters to text nodes
  if (textNodes.length > 0) {
    // Add ZWNBSP, ZWSP, ZWNJ, ZWJ to first text node
    const firstText = textNodes[0];
    if (firstText) {
      firstText.textContent = firstText.textContent + '\uFEFF\u200B\u200C\u200D';
    }
    
    // Add NBSP to second text node if exists
    if (textNodes.length > 1) {
      const secondText = textNodes[1];
      if (secondText) {
        secondText.textContent = secondText.textContent + '\u00A0\u00A0';
      }
    }
    
    // Add TAB to a text node that contains "Tab character"
    for (const textNode of textNodes) {
      if (textNode.textContent?.includes('Tab character')) {
        textNode.textContent = textNode.textContent.replace('→→→', '\t\t\t');
        break;
      }
    }
  }
}, 0);

const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
  autoSnapshot: false,
});

document.getElementById('capture-snapshot')?.addEventListener('click', async () => {
  try {
    const id = await visualizer.captureSnapshot('manual', 'Slate.js snapshot');
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
    a.download = `slatejs-visualizer-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
  }
});

console.log('Slate.js Visualizer initialized');

