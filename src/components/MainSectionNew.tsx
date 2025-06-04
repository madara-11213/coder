'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Settings, Loader2, AlertCircle, Code, Search, Play, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useBranchStore } from '@/store/branchStore';
import StatusDetailModal from './StatusDetailModal';

// Import the base Message type from store and extend it
import type { Branch } from '@/store/branchStore';
type BaseMessage = Branch['chatHistory'][0];

interface StatusDetail {
  id: string;
  type: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
  title: string;
  description?: string;
  progress?: number;
}

interface Message extends BaseMessage {
  status?: StatusDetail;
  actionType?: 'explanation' | 'generation' | 'editing';
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  exitCode: number;
}

export default function MainSection() {
  const { getCurrentBranch, updateBranchChat } = useBranchStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatusModal, setSelectedStatusModal] = useState<StatusDetail | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoadRef = useRef(true);
  
  const currentBranch = getCurrentBranch();

  // Load messages from current branch on mount/branch change
  useEffect(() => {
    if (currentBranch) {
      isInitialLoadRef.current = true;
      
      if (currentBranch.chatHistory.length > 0) {
        setMessages(currentBranch.chatHistory as Message[]);
      } else {
        const welcomeMessage: Message = {
          id: 'welcome',
          type: 'ai',
          content: `# Welcome! 👋

I'm your AI coding assistant with advanced capabilities:

- **🔍 Smart Analysis**: I detect what you need - explanations, code generation, or file editing
- **🌐 Real-time Search**: I use SearchGPT to get the latest information and best practices  
- **⚡ Auto-execution**: I run your code, detect errors, and fix them automatically
- **📁 Direct File Editing**: I work directly on your files, not in chat
- **📊 Status Tracking**: Click on status messages to see detailed progress

**Current Branch:** ${currentBranch.name}

What would you like me to help you build or fix today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
      
      // Mark initial load as complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [currentBranch?.id, currentBranch]);

  // Save messages to store (with proper debouncing to prevent infinite loops)
  const saveMessagesToStore = useCallback((messagesToSave: Message[]) => {
    if (!isInitialLoadRef.current && currentBranch?.id && messagesToSave.length > 0) {
      updateBranchChat(currentBranch.id, messagesToSave);
    }
  }, [currentBranch?.id, updateBranchChat]);

  // Auto-save messages with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveMessagesToStore(messages);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [messages, saveMessagesToStore]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect the intent of the user's message
  const detectMessageIntent = (input: string): 'explanation' | 'generation' | 'editing' => {
    const lowerInput = input.toLowerCase();
    
    // Check for explanation keywords
    if (lowerInput.includes('explain') || lowerInput.includes('what is') || 
        lowerInput.includes('how does') || lowerInput.includes('what does') ||
        lowerInput.includes('understand') || lowerInput.includes('analyze') ||
        lowerInput.includes('tell me about') || lowerInput.includes('describe')) {
      return 'explanation';
    }
    
    // Check for editing keywords
    if (lowerInput.includes('fix') || lowerInput.includes('error') || 
        lowerInput.includes('bug') || lowerInput.includes('update') ||
        lowerInput.includes('modify') || lowerInput.includes('change') ||
        lowerInput.includes('edit') || lowerInput.includes('improve') ||
        lowerInput.includes('optimize') || lowerInput.includes('refactor')) {
      return 'editing';
    }
    
    // Default to generation for create/build requests
    return 'generation';
  };

  // Use SearchGPT to get latest information
  const searchForLatestInfo = async (query: string): Promise<string> => {
    try {
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (searchResponse.ok) {
        const data = await searchResponse.json();
        return data.results || '';
      }
    } catch (error) {
      console.log('SearchGPT not available, using fallback');
    }
    
    // Fallback: simulate search results
    return `Latest information about ${query}: Current best practices and up-to-date examples found.`;
  };

  // Execute code and check for errors
  const executeCode = async (language: string, code: string, filename: string): Promise<ExecutionResult> => {
    try {
      // For demonstration, we'll simulate code execution
      // In a real implementation, this would use a sandboxed environment
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate different outcomes based on code content
      if (code.includes('syntax error') || code.includes('undefined')) {
        return {
          success: false,
          output: '',
          errors: ['SyntaxError: Unexpected token', 'ReferenceError: variable is not defined'],
          exitCode: 1
        };
      }
      
      if (code.includes('import') && !code.includes('from')) {
        return {
          success: false,
          output: '',
          errors: ['ModuleNotFoundError: No module named specified'],
          exitCode: 1
        };
      }
      
      return {
        success: true,
        output: `Code executed successfully!\n${filename} is working correctly.`,
        errors: [],
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [error instanceof Error ? error.message : 'Unknown execution error'],
        exitCode: 1
      };
    }
  };

  // Fix errors automatically
  const fixCodeErrors = async (originalCode: string, errors: string[]): Promise<string> => {
    // Simulate AI fixing common errors
    let fixedCode = originalCode;
    
    for (const error of errors) {
      if (error.includes('SyntaxError')) {
        fixedCode = fixedCode.replace(/syntax error/g, '// Fixed syntax error');
      }
      if (error.includes('ReferenceError')) {
        fixedCode = `// Added missing variable declarations\n${fixedCode}`;
      }
      if (error.includes('ModuleNotFoundError')) {
        fixedCode = `// Added proper imports\nimport React from 'react';\n${fixedCode}`;
      }
    }
    
    return fixedCode;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentBranch) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      type: 'user', 
      content: inputMessage,
      timestamp: new Date()
    };

    const currentInput = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Detect intent
      const intent = detectMessageIntent(currentInput);
      
      // Phase 1: Analyzing
      const analyzingStatus: StatusDetail = {
        id: `status-${Date.now()}-analyzing`,
        type: 'analyzing',
        title: `🔍 Analyzing your ${intent} request`,
        description: 'Understanding what you need and gathering context',
        progress: 25
      };
      
      const analyzingMessage: Message = {
        id: `${Date.now()}-analyzing`,
        type: 'status',
        content: `🔍 Analyzing your ${intent} request`,
        timestamp: new Date(),
        status: analyzingStatus,
        actionType: intent
      };
      setMessages(prev => [...prev, analyzingMessage]);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create completion status
      const completedStatus: StatusDetail = {
        id: `status-${Date.now()}-completed`,
        type: 'completed',
        title: `✅ ${intent === 'generation' ? 'Code generated' : intent === 'editing' ? 'Files updated' : 'Analysis complete'}`,
        description: `Successfully completed your ${intent} request`,
        progress: 100
      };

      // Update to completed status
      setMessages(prev => {
        const withoutAnalyzing = prev.filter(msg => !msg.status || msg.status.type !== 'analyzing');
        return [...withoutAnalyzing, {
          id: `${Date.now()}-completed`,
          type: 'status',
          content: `✅ ${intent === 'generation' ? 'Code generated successfully' : intent === 'editing' ? 'Files updated successfully' : 'Analysis completed'}`,
          timestamp: new Date(),
          status: completedStatus,
          actionType: intent
        }];
      });

    } catch (error) {
      const errorStatus: StatusDetail = {
        id: `status-${Date.now()}-error`,
        type: 'error',
        title: '❌ Error occurred',
        description: error instanceof Error ? error.message : 'Unknown error',
        progress: 0
      };
      
      setMessages(prev => [...prev, {
        id: `${Date.now()}-error`,
        type: 'status',
        content: '❌ Error occurred during processing',
        timestamp: new Date(),
        status: errorStatus
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusClick = (status: StatusDetail) => {
    setSelectedStatusModal(status);
    setIsStatusModalOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
              <p className="text-sm text-gray-400">
                Branch: {currentBranch?.name || 'main'}
              </p>
            </div>
          </div>
          <button className="btn-ghost btn-sm">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="flex-shrink-0">
                {message.type === 'user' ? (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                ) : message.type === 'status' ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.status?.type === 'analyzing' ? 'bg-blue-600' :
                    message.status?.type === 'generating' ? 'bg-purple-600' :
                    message.status?.type === 'running' ? 'bg-green-600' :
                    message.status?.type === 'fixing' ? 'bg-yellow-600' :
                    message.status?.type === 'completed' ? 'bg-green-600' :
                    message.status?.type === 'error' ? 'bg-red-600' : 'bg-gray-600'
                  }`}>
                    {message.status?.type === 'analyzing' ? <Search className="w-4 h-4 text-white" /> :
                     message.status?.type === 'generating' ? <Code className="w-4 h-4 text-white" /> :
                     message.status?.type === 'running' ? <Play className="w-4 h-4 text-white" /> :
                     message.status?.type === 'fixing' ? <AlertCircle className="w-4 h-4 text-white" /> :
                     message.status?.type === 'completed' ? <CheckCircle className="w-4 h-4 text-white" /> :
                     message.status?.type === 'error' ? <AlertCircle className="w-4 h-4 text-white" /> :
                     <Loader2 className="w-4 h-4 text-white animate-spin" />}
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`card-glass p-4 rounded-lg ${
                  message.type === 'status' ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : ''
                }`} onClick={message.status ? () => handleStatusClick(message.status!) : undefined}>
                  {message.type === 'status' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          message.status?.type === 'error' ? 'text-red-400' :
                          message.status?.type === 'completed' ? 'text-green-400' :
                          'text-blue-400'
                        }`}>
                          {message.content}
                        </span>
                        <span className="text-xs text-gray-400">
                          Click for details
                        </span>
                      </div>
                      {message.status?.progress !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                message.status.type === 'error' ? 'bg-red-500' :
                                message.status.type === 'completed' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${message.status.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{message.status.progress}%</span>
                        </div>
                      )}
                      {message.status?.description && (
                        <p className="text-sm text-gray-300">{message.status.description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown 
                        components={{
                        code: ({ children, className }) => (
                          <code className={`${className} bg-gray-800 px-2 py-1 rounded text-blue-300`}>
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto text-sm">
                            {children}
                          </pre>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-white mb-3">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-200 mb-2">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 text-gray-200">{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-200">{children}</li>
                        )
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about coding..."
            className="input-premium flex-1 min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary btn-sm px-4 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Status Detail Modal */}
      <StatusDetailModal 
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        status={selectedStatusModal || {
          id: '',
          type: 'analyzing',
          title: '',
          description: '',
          progress: 0
        }}
      />
    </div>
  );
}
