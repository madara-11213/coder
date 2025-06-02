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
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'explain',
      label: 'Explain Code',
      icon: <Code size={16} />,
      prompt: 'Can you explain this code and what it does?'
    },
    {
      id: 'optimize',
      label: 'Optimize Code',
      icon: <Lightbulb size={16} />,
      prompt: 'How can I optimize this code for better performance?'
    },
    {
      id: 'debug',
      label: 'Debug Help',
      icon: <FileText size={16} />,
      prompt: 'I\'m having trouble with this code. Can you help me debug it?'
    },
    {
      id: 'document',
      label: 'Add Documentation',
      icon: <FileText size={16} />,
      prompt: 'Can you help me add proper documentation to this code?'
    }
  ];

  // Sample initial message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'ai',
      content: `# Welcome to AI Assistant! 🤖

I'm here to help you with your coding projects. I can:

- **Explain code** and algorithms
- **Debug issues** and suggest fixes
- **Optimize performance** and suggest improvements
- **Write documentation** and comments
- **Generate code** snippets and examples
- **Answer questions** about programming concepts

Feel free to ask me anything or use the quick actions below!`,
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
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(inputMessage),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000);
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
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="claude-3">Claude 3</option>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'ai' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={16} />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div className={`
                rounded-lg px-4 py-3 
                ${message.type === 'user' 
                  ? 'bg-blue-600 text-white ml-auto' 
                  : 'bg-gray-800 border border-gray-700'
                }
              `}>
                {message.type === 'ai' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{message.timestamp.toLocaleTimeString()}</span>
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
    </div>
  );
}
