'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { 
  Save, 
  Copy, 
  Undo2, 
  Redo2, 
  Search, 
  Replace,
  ZoomIn,
  ZoomOut,
  Settings
} from 'lucide-react';

interface CodeEditorProps {
  selectedFile: string | null;
}

interface FileContent {
  [key: string]: string;
}

export default function CodeEditor({ selectedFile }: CodeEditorProps) {
  const [fileContents, setFileContents] = useState<FileContent>({});
  const [currentContent, setCurrentContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [fontSize, setFontSize] = useState(14);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef<any>(null);

  // Sample file contents
  const sampleContents: FileContent = {
    'my-react-app/src/App.js': `import React from 'react';
import './App.css';

function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
    </div>
  );
}

export default App;`,
    'my-react-app/src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    'my-react-app/src/App.css': `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

button {
  background: #61dafb;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 10px;
}`,
    'my-react-app/package.json': `{
  "name": "my-react-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`,
    'python-scripts/main.py': `#!/usr/bin/env python3
"""
Main script for Python project
"""

import sys
from utils import helper_function

def main():
    """Main function"""
    print("Hello, World!")
    
    # Example usage
    result = helper_function("test")
    print(f"Result: {result}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())`,
    'python-scripts/utils.py': `"""
Utility functions for the project
"""

def helper_function(input_str: str) -> str:
    """
    Helper function that processes input string
    
    Args:
        input_str: Input string to process
        
    Returns:
        Processed string
    """
    return f"Processed: {input_str.upper()}"

def another_helper(data):
    """Another utility function"""
    return len(data) if data else 0`
  };

  // Load file content when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      setIsLoading(true);
      
      // Simulate loading delay
      setTimeout(() => {
        const content = sampleContents[selectedFile] || fileContents[selectedFile] || '';
        setCurrentContent(content);
        
        // Detect language from file extension
        const extension = selectedFile.split('.').pop()?.toLowerCase();
        const langMap: { [key: string]: string } = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'py': 'python',
          'css': 'css',
          'html': 'html',
          'json': 'json',
          'md': 'markdown',
          'txt': 'plaintext'
        };
        setLanguage(langMap[extension || ''] || 'plaintext');
        setIsLoading(false);
      }, 200);
    }
  }, [selectedFile, fileContents]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleSave = () => {
    if (selectedFile) {
      setFileContents(prev => ({
        ...prev,
        [selectedFile]: currentContent
      }));
      
      // Show save confirmation
      console.log('File saved:', selectedFile);
    }
  };

  const handleCopy = () => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const selectedText = editorRef.current.getModel()?.getValueInRange(selection);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      } else {
        navigator.clipboard.writeText(currentContent);
      }
    }
  };

  const handleUndo = () => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  };

  const handleFind = () => {
    editorRef.current?.trigger('keyboard', 'actions.find', null);
  };

  const handleReplace = () => {
    editorRef.current?.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(32, prev + delta)));
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl mb-2">No file selected</h3>
          <p>Select a file from the explorer to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Editor Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{selectedFile}</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            {language}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            title="Save (Ctrl+S)"
          >
            <Save size={14} />
            Save
          </button>
          
          <div className="border-l border-gray-600 mx-2 h-6"></div>
          
          <button onClick={handleUndo} className="p-1 hover:bg-gray-700 rounded" title="Undo">
            <Undo2 size={16} />
          </button>
          
          <button onClick={handleRedo} className="p-1 hover:bg-gray-700 rounded" title="Redo">
            <Redo2 size={16} />
          </button>
          
          <button onClick={handleCopy} className="p-1 hover:bg-gray-700 rounded" title="Copy">
            <Copy size={16} />
          </button>
          
          <div className="border-l border-gray-600 mx-2 h-6"></div>
          
          <button onClick={handleFind} className="p-1 hover:bg-gray-700 rounded" title="Find">
            <Search size={16} />
          </button>
          
          <button onClick={handleReplace} className="p-1 hover:bg-gray-700 rounded" title="Replace">
            <Replace size={16} />
          </button>
          
          <div className="border-l border-gray-600 mx-2 h-6"></div>
          
          <button 
            onClick={() => adjustFontSize(-1)} 
            className="p-1 hover:bg-gray-700 rounded" 
            title="Decrease font size"
          >
            <ZoomOut size={16} />
          </button>
          
          <span className="text-xs text-gray-400 min-w-[30px] text-center">{fontSize}px</span>
          
          <button 
            onClick={() => adjustFontSize(1)} 
            className="p-1 hover:bg-gray-700 rounded" 
            title="Increase font size"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={currentContent}
            onChange={(value) => setCurrentContent(value || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize,
              fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
              fontLigatures: true,
              minimap: { enabled: true },
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
