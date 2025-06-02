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
  Settings,
  Play,
  Bug,
  Sparkles
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
  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
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

  const runCode = async () => {
    if (!currentContent.trim()) return;
    
    setIsRunning(true);
    setShowOutput(true);
    setExecutionOutput('Running code...\n');

    try {
      if (language === 'javascript') {
        // For JavaScript, we'll use eval in a sandboxed environment
        const output = runJavaScript(currentContent);
        setExecutionOutput(output);
      } else if (language === 'python') {
        // For Python, we'd need a backend service or use Pyodide
        setExecutionOutput('Python execution not yet implemented. Use the terminal for now.');
      } else {
        setExecutionOutput(`Code execution for ${language} not yet implemented.`);
      }
    } catch (error) {
      const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
      setExecutionOutput(errorMessage);
      
      // Auto-fix with AI if there's an error
      await autoFixCode(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  const runJavaScript = (code: string): string => {
    const output: string[] = [];
    const originalConsoleLog = console.log;
    
    // Override console.log to capture output
    console.log = (...args) => {
      output.push(args.map(arg => String(arg)).join(' '));
    };

    try {
      // Simple eval - in production this should be more secure
      eval(code);
      return output.join('\n') || 'Code executed successfully (no output)';
    } catch (error) {
      throw error;
    } finally {
      console.log = originalConsoleLog;
    }
  };

  const autoFixCode = async (errorMessage: string) => {
    try {
      setExecutionOutput(prev => prev + '\n\n🤖 AI is analyzing the error and suggesting fixes...\n');
      
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a code debugging assistant. When given code with an error, provide the corrected version of the code. Only return the fixed code, no explanations unless specifically requested.'
            },
            {
              role: 'user',
              content: `Fix this ${language} code that has an error:\n\nERROR: ${errorMessage}\n\nCODE:\n${currentContent}\n\nPlease provide the corrected code:`
            }
          ],
          model: 'openai'
        })
      });

      if (response.ok) {
        const fixedCode = await response.text();
        setExecutionOutput(prev => prev + `\n💡 Suggested fix:\n${fixedCode}\n\nClick "Apply Fix" to use this code.`);
        
        // Store the suggested fix
        (window as any).suggestedFix = fixedCode;
      }
    } catch (error) {
      setExecutionOutput(prev => prev + '\n❌ Failed to get AI assistance for fixing the error.');
    }
  };

  const applyAIFix = () => {
    const suggestedFix = (window as any).suggestedFix;
    if (suggestedFix) {
      setCurrentContent(suggestedFix);
      setExecutionOutput(prev => prev + '\n✅ AI fix applied!');
    }
  };

  const debugCode = async () => {
    setShowOutput(true);
    setExecutionOutput('🔍 AI is analyzing your code for potential issues...\n');

    try {
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a code debugging assistant. Analyze the provided code and identify potential bugs, issues, or improvements. Provide specific feedback.'
            },
            {
              role: 'user',
              content: `Please analyze this ${language} code for bugs and potential issues:\n\n${currentContent}`
            }
          ],
          model: 'openai'
        })
      });

      if (response.ok) {
        const analysis = await response.text();
        setExecutionOutput(`🔍 Code Analysis:\n\n${analysis}`);
      }
    } catch (error) {
      setExecutionOutput('❌ Failed to analyze code with AI.');
    }
  };

  const optimizeCode = async () => {
    setShowOutput(true);
    setExecutionOutput('✨ AI is optimizing your code...\n');

    try {
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a code optimization assistant. Optimize the provided code for better performance, readability, and best practices. Return the optimized code with brief explanations of changes.'
            },
            {
              role: 'user',
              content: `Please optimize this ${language} code:\n\n${currentContent}`
            }
          ],
          model: 'openai'
        })
      });

      if (response.ok) {
        const optimizedCode = await response.text();
        setExecutionOutput(`✨ Optimized Code:\n\n${optimizedCode}\n\nClick "Apply Optimization" to use this code.`);
        
        // Store the optimized code
        (window as any).optimizedCode = optimizedCode;
      }
    } catch (error) {
      setExecutionOutput('❌ Failed to optimize code with AI.');
    }
  };

  const applyOptimization = () => {
    const optimizedCode = (window as any).optimizedCode;
    if (optimizedCode) {
      setCurrentContent(optimizedCode);
      setExecutionOutput(prev => prev + '\n✅ Optimization applied!');
    }
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
          
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
            title="Run Code"
          >
            <Play size={14} />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          
          <button
            onClick={debugCode}
            className="flex items-center gap-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
            title="Debug with AI"
          >
            <Bug size={14} />
            Debug
          </button>
          
          <button
            onClick={optimizeCode}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            title="Optimize with AI"
          >
            <Sparkles size={14} />
            Optimize
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

      {/* Code Editor and Output */}
      <div className="flex-1 flex flex-col">
        <div className={`${showOutput ? 'h-2/3' : 'h-full'}`}>
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

        {/* Output Panel */}
        {showOutput && (
          <div className="h-1/3 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <h3 className="text-sm font-medium">Output</h3>
              <div className="flex items-center gap-2">
                {(window as any).suggestedFix && (
                  <button
                    onClick={applyAIFix}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  >
                    Apply Fix
                  </button>
                )}
                {(window as any).optimizedCode && (
                  <button
                    onClick={applyOptimization}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                  >
                    Apply Optimization
                  </button>
                )}
                <button
                  onClick={() => setShowOutput(false)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 h-full overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {executionOutput}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
