'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Trash2, 
  Settings as SettingsIcon,
  Code,
  FileText,
  Lightbulb,
  Play,
  Bug,
  Sparkles,
  Loader
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CodeGenerator from './CodeGenerator';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  status?: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

interface AIStatus {
  isActive: boolean;
  currentAction: string;
  progress: number;
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [aiStatus, setAiStatus] = useState<AIStatus>({ isActive: false, currentAction: '', progress: 0 });
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [selectedAIResponse, setSelectedAIResponse] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pollinationsModels = [
    'openai',
    'openai-fast', 
    'openai-large',
    'openai-roblox',
    'qwen-coder',
    'llama',
    'llamascout',
    'mistral',
    'unity',
    'mirexa',
    'midijourney',
    'rtist',
    'searchgpt',
    'evil',
    'deepseek-reasoning',
    'phi',
    'hormoz',
    'hypnosis-tracy',
    'deepseek',
    'grok',
    'sur',
    'bidara'
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'generate',
      label: 'Generate Code',
      icon: <Code size={16} />,
      prompt: 'Generate a complete code solution for:'
    },
    {
      id: 'explain',
      label: 'Explain Code',
      icon: <FileText size={16} />,
      prompt: 'Explain this code and how it works:'
    },
    {
      id: 'optimize',
      label: 'Optimize Code',
      icon: <Sparkles size={16} />,
      prompt: 'Optimize this code for better performance:'
    },
    {
      id: 'debug',
      label: 'Debug & Fix',
      icon: <Bug size={16} />,
      prompt: 'Debug and fix any errors in this code:'
    },
    {
      id: 'run',
      label: 'Run & Test',
      icon: <Play size={16} />,
      prompt: 'Run this code and test it for errors:'
    }
  ];

  // Sample initial message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'ai',
      content: `# Welcome to AI Code Assistant! 🤖

I'm powered by Pollinations.ai and can help you build, debug, and optimize your code. I can:

## 🔧 Code Generation
- Generate complete applications from scratch
- Create specific functions and components
- Build websites, bots, and applications

## 🐛 Debug & Fix
- Automatically detect and fix errors
- Run code and identify issues
- Suggest improvements and optimizations

## 🚀 Smart Development
- Real-time code editing and testing
- Virtual environment simulation
- Branch-like code management

**Just describe what you want to build, and I'll generate the complete code, run it, test it, and fix any errors automatically!**

Choose your preferred AI model above and let's start coding!`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setAiStatus({ isActive: true, currentAction: 'Analyzing request...', progress: 20 });

    try {
      // Use the correct pollinations.ai API format as provided by the user
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'L0jejdsYQOrz1lFp',
          'token': 'L0jejdsYQOrz1lFp'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: 'You are a professional coding assistant powered by Pollinations.ai. You can generate complete code solutions, debug errors, optimize performance, and help build any type of application. When generating code, provide complete, working solutions with proper structure and comments. If the user asks you to build something, provide the complete file structure and all necessary code.'
            },
            {
              role: 'user',
              content: currentInput
            }
          ],
          temperature: 0.7,
          top_p: 1.0,
          seed: Math.floor(Math.random() * 1000000),
          private: true,
          nofeed: true,
          token: 'L0jejdsYQOrz1lFp',
          referrer: 'L0jejdsYQOrz1lFp'
        })
      });

      setAiStatus({ isActive: true, currentAction: 'Generating response...', progress: 60 });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiContent = await response.text();
      
      setAiStatus({ isActive: true, currentAction: 'Processing response...', progress: 90 });

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiContent,
        timestamp: new Date(),
        status: 'completed'
      };
      setMessages(prev => [...prev, aiResponse]);

      // If the response contains code, offer to create/edit files
      if (aiContent.includes('```') || currentInput.toLowerCase().includes('generate') || currentInput.toLowerCase().includes('create')) {
        setTimeout(() => {
          const systemMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'system',
            content: '💡 **I can help you implement this code!** Click the "Generate Files" button below to automatically create the project structure and files.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, systemMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error calling AI API:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ **Error connecting to AI service**

There was an issue connecting to Pollinations.ai. This could be due to:
- Network connectivity issues
- API rate limits
- Service temporarily unavailable

Please try again in a moment.`,
        timestamp: new Date(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      setAiStatus({ isActive: false, currentAction: '', progress: 0 });
    }
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('explain') || input.includes('what does')) {
      return `I'd be happy to explain that for you! Based on your question about "${userInput}", here's what I can tell you:

## Code Explanation

This appears to be asking about code functionality. To provide a more specific explanation, I would need to see the actual code you're referring to.

**General tips for understanding code:**
- Look at function names and variable names
- Follow the data flow from input to output  
- Break down complex operations into smaller steps
- Check for any comments or documentation

Would you like to share the specific code you'd like me to explain?`;
    }
    
    if (input.includes('debug') || input.includes('error') || input.includes('problem')) {
      return `Let me help you debug this issue! 🔍

## Debugging Approach

1. **Identify the symptoms** - What exactly is happening vs. what you expect?
2. **Check the console** - Are there any error messages?
3. **Review recent changes** - What was the last thing you modified?
4. **Use logging** - Add console.log statements to trace execution
5. **Test incrementally** - Comment out parts to isolate the issue

**Common debugging tools:**
- Browser DevTools (F12)
- Console logging
- Breakpoints
- Network tab for API issues

Please share the specific error message or code that's causing trouble, and I'll provide more targeted help!`;
    }
    
    if (input.includes('optimize') || input.includes('performance')) {
      return `Great question about optimization! 🚀

## Performance Optimization Tips

**For JavaScript/React:**
- Use React.memo() for component optimization
- Implement lazy loading for components
- Minimize bundle size with code splitting
- Use useCallback and useMemo hooks appropriately

**General principles:**
- Avoid premature optimization
- Profile before optimizing
- Focus on bottlenecks first
- Consider algorithmic improvements

**Tools to help:**
- React DevTools Profiler
- Chrome Performance tab
- Lighthouse audits
- Bundle analyzers

Share your specific code and I can provide more targeted optimization suggestions!`;
    }
    
    return `Thank you for your question! I understand you're asking about: "${userInput}"

I'm here to help with coding questions, debugging, explanations, and optimizations. To provide the most helpful response, could you:

1. **Share specific code** if you're asking about implementation
2. **Describe the context** - what are you trying to achieve?
3. **Include error messages** if you're troubleshooting
4. **Specify the programming language** you're working with

Feel free to ask follow-up questions or use the quick action buttons for common requests!`;
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputMessage(action.prompt);
    inputRef.current?.focus();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearChat = () => {
    setMessages(messages.slice(0, 1)); // Keep welcome message
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm max-w-[150px]"
            title="Select AI Model"
          >
            {pollinationsModels.map(model => (
              <option key={model} value={model}>
                {model.charAt(0).toUpperCase() + model.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
          
          <button 
            onClick={clearChat}
            className="p-1 hover:bg-gray-700 rounded" 
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
          
          <button className="p-1 hover:bg-gray-700 rounded" title="Settings">
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      {/* AI Status Bar */}
      {aiStatus.isActive && (
        <div className="bg-blue-600 text-white px-4 py-2 text-sm flex items-center gap-2">
          <Loader className="animate-spin" size={16} />
          <span>{aiStatus.currentAction}</span>
          <div className="flex-1 bg-blue-800 rounded-full h-2 ml-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${aiStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {(message.type === 'ai' || message.type === 'system') && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                message.type === 'system' ? 'bg-orange-600' : 'bg-blue-600'
              }`}>
                <Bot size={16} />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div className={`
                rounded-lg px-4 py-3 
                ${message.type === 'user' 
                  ? 'bg-blue-600 text-white ml-auto' 
                  : message.type === 'system'
                  ? 'bg-orange-600/20 border border-orange-600/30'
                  : 'bg-gray-800 border border-gray-700'
                }
              `}>
                {(message.type === 'ai' || message.type === 'system') ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                
                {/* Show action buttons for AI responses with code */}
                {message.type === 'ai' && message.content.includes('```') && (
                  <div className="mt-3 pt-3 border-t border-gray-600 flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedAIResponse(message.content);
                        setShowCodeGenerator(true);
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
                    >
                      <Code size={14} />
                      Generate Files
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAIResponse(message.content);
                        setShowCodeGenerator(true);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1"
                    >
                      <Play size={14} />
                      Run & Test
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{message.timestamp.toLocaleTimeString()}</span>
                {message.status && (
                  <span className={`px-2 py-1 rounded text-xs ${
                    message.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                    message.status === 'error' ? 'bg-red-600/20 text-red-400' :
                    'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {message.status}
                  </span>
                )}
                <button 
                  onClick={() => copyMessage(message.content)}
                  className="hover:text-gray-300"
                  title="Copy message"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Quick actions:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm transition-colors"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about coding..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 resize-none focus:outline-none focus:border-blue-500"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg px-4 py-2 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      {/* Code Generator Modal */}
      {showCodeGenerator && (
        <CodeGenerator
          aiResponse={selectedAIResponse}
          onClose={() => setShowCodeGenerator(false)}
        />
      )}
    </div>
  );
}
