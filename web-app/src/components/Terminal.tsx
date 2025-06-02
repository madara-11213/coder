'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Copy, 
  Download,
  Settings as SettingsIcon,
  Plus,
  X
} from 'lucide-react';

interface TerminalTab {
  id: string;
  name: string;
  terminal: XTerm;
  fitAddon: FitAddon;
}

export default function Terminal() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create initial terminal tab
    createNewTab();
    
    return () => {
      // Cleanup terminals on unmount
      tabs.forEach(tab => {
        tab.terminal.dispose();
      });
    };
  }, []);

  const createNewTab = () => {
    const tabId = `tab-${Date.now()}`;
    const terminal = new XTerm({
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        black: '#1d202f',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5'
      },
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      rows: 24,
      cols: 80
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    const newTab: TerminalTab = {
      id: tabId,
      name: `Terminal ${tabs.length + 1}`,
      terminal,
      fitAddon
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);

    // Setup terminal after it's rendered
    setTimeout(() => {
      if (terminalContainerRef.current) {
        terminal.open(terminalContainerRef.current);
        fitAddon.fit();
        
        // Welcome message
        terminal.writeln('\x1b[1;34mWelcome to Web Terminal!\x1b[0m');
        terminal.writeln('This is a simulated terminal environment.');
        terminal.writeln('Type commands below:');
        terminal.writeln('');
        
        // Setup command handling
        setupTerminalCommands(terminal);
        
        setIsConnected(true);
      }
    }, 100);
  };

  const setupTerminalCommands = (terminal: XTerm) => {
    let currentInput = '';
    let promptShown = false;
    
    const showPrompt = () => {
      if (!promptShown) {
        terminal.write('\r\n\x1b[32muser@webcoder\x1b[0m:\x1b[34m~\x1b[0m$ ');
        promptShown = true;
      }
    };

    const executeCommand = (command: string) => {
      const cmd = command.trim().toLowerCase();
      terminal.writeln('');
      
      switch (cmd) {
        case 'help':
          terminal.writeln('Available commands:');
          terminal.writeln('  help     - Show this help message');
          terminal.writeln('  clear    - Clear the terminal');
          terminal.writeln('  ls       - List files');
          terminal.writeln('  pwd      - Print working directory');
          terminal.writeln('  whoami   - Show current user');
          terminal.writeln('  date     - Show current date');
          terminal.writeln('  echo     - Echo text');
          terminal.writeln('  node -v  - Show Node.js version');
          terminal.writeln('  python --version - Show Python version');
          break;
          
        case 'clear':
          terminal.clear();
          break;
          
        case 'ls':
          terminal.writeln('projects/    documents/    downloads/');
          terminal.writeln('my-react-app/    python-scripts/');
          break;
          
        case 'pwd':
          terminal.writeln('/home/user');
          break;
          
        case 'whoami':
          terminal.writeln('user');
          break;
          
        case 'date':
          terminal.writeln(new Date().toString());
          break;
          
        case 'node -v':
          terminal.writeln('v18.17.0');
          break;
          
        case 'python --version':
          terminal.writeln('Python 3.11.4');
          break;
          
        default:
          if (cmd.startsWith('echo ')) {
            terminal.writeln(command.substring(5));
          } else if (cmd === '') {
            // Empty command, just show prompt
          } else {
            terminal.writeln(`bash: ${cmd}: command not found`);
          }
          break;
      }
      
      promptShown = false;
      showPrompt();
    };

    // Initial prompt
    showPrompt();

    terminal.onData((data) => {
      const char = data.charCodeAt(0);
      
      if (char === 13) { // Enter
        executeCommand(currentInput);
        currentInput = '';
      } else if (char === 127) { // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (char >= 32) { // Printable characters
        currentInput += data;
        terminal.write(data);
      }
    });
  };

  const closeTab = (tabId: string) => {
    const tabToClose = tabs.find(tab => tab.id === tabId);
    if (tabToClose) {
      tabToClose.terminal.dispose();
    }
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    } else if (newTabs.length === 0) {
      setActiveTabId('');
      setIsConnected(false);
    }
  };

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab && terminalContainerRef.current) {
      // Clear container and mount the selected terminal
      terminalContainerRef.current.innerHTML = '';
      tab.terminal.open(terminalContainerRef.current);
      tab.fitAddon.fit();
    }
  };

  const clearTerminal = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      activeTab.terminal.clear();
    }
  };

  const copyTerminalContent = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      const selection = activeTab.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const downloadTerminalLog = () => {
    // In a real implementation, you'd capture the terminal history
    const content = 'Terminal session log\n===================\n[This would contain the terminal history]';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Terminal</h2>
          
          <div className="flex items-center gap-2">
            <div className={`
              w-3 h-3 rounded-full 
              ${isConnected ? 'bg-green-400' : 'bg-red-400'}
            `} title={isConnected ? 'Connected' : 'Disconnected'} />
            
            <button 
              onClick={clearTerminal}
              className="p-1 hover:bg-gray-700 rounded" 
              title="Clear terminal"
            >
              <RotateCcw size={16} />
            </button>
            
            <button 
              onClick={copyTerminalContent}
              className="p-1 hover:bg-gray-700 rounded" 
              title="Copy selection"
            >
              <Copy size={16} />
            </button>
            
            <button 
              onClick={downloadTerminalLog}
              className="p-1 hover:bg-gray-700 rounded" 
              title="Download log"
            >
              <Download size={16} />
            </button>
            
            <button className="p-1 hover:bg-gray-700 rounded" title="Settings">
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>

        {/* Terminal Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`
                flex items-center gap-2 px-3 py-1 rounded-t-lg cursor-pointer
                ${activeTabId === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
              onClick={() => switchTab(tab.id)}
            >
              <span className="text-sm">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={createNewTab}
            className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="New terminal"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 bg-gray-900 p-4">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💻</div>
              <p>No terminal sessions</p>
              <button 
                onClick={createNewTab}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Create New Terminal
              </button>
            </div>
          </div>
        ) : (
          <div 
            ref={terminalContainerRef}
            className="h-full w-full"
            style={{ fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace' }}
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <div>
            Web Terminal - Type 'help' for available commands
          </div>
          <div className="flex items-center gap-4">
            <span>Encoding: UTF-8</span>
            <span>Shell: bash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
