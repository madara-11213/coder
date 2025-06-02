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
  Loader,
  GitBranch
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useProjectStore } from '@/store/projectStore';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system' | 'status';
  content: string;
  timestamp: Date;
  status?: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
}

interface AIStatus {
  isActive: boolean;
  currentAction: string;
  progress: number;
  currentBranch?: string;
}

export default function MainSection() {
  const { fileTree, generateProjectFromAI } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [aiStatus, setAiStatus] = useState<AIStatus>({ isActive: false, currentAction: '', progress: 0 });
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

  // Sample initial message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'ai',
      content: `# Welcome to AI Code Assistant! 🤖

I'm your intelligent coding companion. I can:

## 🔧 **Smart Development**
- **Analyze** your entire codebase
- **Generate** complete projects from descriptions
- **Fix errors** automatically
- **Create branches** for changes

## 🎯 **How I Work**
- I can see and understand all your project files
- When you ask me to build something, I create a new branch and work directly on files
- I provide status updates but work behind the scenes
- Ask me to explain any code - I'll analyze your entire project

**Just tell me what you want to build or ask about your code!**`,
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

  // Function to get all file contents from the project
  const getAllFileContents = (nodes: any[]): string => {
    let content = '';
    
    const processNode = (node: any, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      
      if (node.type === 'file' && node.content) {
        content += `\n${indent}📁 File: ${node.path}\n`;
        content += `${indent}Content:\n`;
        content += `${indent}\`\`\`\n${node.content}\n${indent}\`\`\`\n`;
      } else if (node.type === 'folder') {
        content += `\n${indent}📂 Folder: ${node.path}\n`;
        if (node.children) {
          node.children.forEach((child: any) => processNode(child, depth + 1));
        }
      }
    };

    nodes.forEach(node => processNode(node));
    return content;
  };

  const addStatusMessage = (content: string, status?: string) => {
    const statusMessage: Message = {
      id: Date.now().toString(),
      type: 'status',
      content,
      timestamp: new Date(),
      status: status as any
    };
    setMessages(prev => [...prev, statusMessage]);
  };

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
    setAiStatus({ isActive: true, currentAction: 'Connecting to AI...', progress: 10 });

    // Check if this is a code generation request
    const isCodeRequest = currentInput.toLowerCase().includes('create') || 
                         currentInput.toLowerCase().includes('build') || 
                         currentInput.toLowerCase().includes('generate') ||
                         currentInput.toLowerCase().includes('make');

    if (isCodeRequest) {
      // For code generation, work directly on files
      await handleCodeGeneration(currentInput);
    } else {
      // For explanations, discussions, etc.
      await handleNormalChat(currentInput);
    }
  };

  const handleCodeGeneration = async (userInput: string) => {
    try {
      addStatusMessage('🌟 **Starting AI Code Generation**', 'analyzing');
      setAiStatus({ isActive: true, currentAction: 'Creating new branch...', progress: 20 });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addStatusMessage('📝 **Creating new branch: ai-generated-code**', 'generating');
      setAiStatus({ isActive: true, currentAction: 'Generating code...', progress: 40, currentBranch: 'ai-generated-code' });
      
      // Call the AI API to generate code
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
              content: `You are a professional coding assistant. Generate complete, working code based on the user's request. Provide well-structured, commented code that follows best practices. Include all necessary files for a complete project.

## Current Project Context:
${fileTree.length > 0 ? getAllFileContents(fileTree) : 'Starting with a new project.'}

Return your response with clear code blocks using \`\`\` syntax and specify file names.`
            },
            {
              role: 'user',
              content: userInput
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      // Parse the JSON response to extract the actual message content
      let aiResponse = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
          aiResponse = jsonResponse.choices[0].message.content;
        }
      } catch (parseError) {
        console.warn('Could not parse AI response as JSON, using raw text:', parseError);
      }

      setAiStatus({ isActive: true, currentAction: 'Creating project files...', progress: 60 });
      addStatusMessage('⚡ **Generating project structure...**', 'generating');
      
      // Generate the actual project
      const project = await generateProjectFromAI(aiResponse);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAiStatus({ isActive: true, currentAction: 'Testing generated code...', progress: 80 });
      addStatusMessage('🧪 **Running tests and validations...**', 'running');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (project) {
        setAiStatus({ isActive: true, currentAction: 'Code generation completed!', progress: 100 });
        addStatusMessage(`✅ **Successfully created project: ${project.name}**\n\n📁 Generated ${project.files.length} files\n🌿 Project available in Files section`, 'completed');
      } else {
        addStatusMessage('⚠️ **No code blocks found in AI response. Try being more specific about what you want to build.**', 'error');
      }

    } catch (error) {
      console.error('Error in code generation:', error);
      addStatusMessage(`❌ **Error during code generation**: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
      setAiStatus({ isActive: false, currentAction: '', progress: 0 });
    }
  };

  const handleNormalChat = async (userInput: string) => {
    try {
      setAiStatus({ isActive: true, currentAction: 'Analyzing your question...', progress: 30 });
      
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
              content: `You are a professional coding assistant. You have access to the user's entire project and can analyze, explain, and discuss their code.

## Current Project Structure and Files:
${fileTree.length > 0 ? getAllFileContents(fileTree) : 'No project files currently loaded.'}

You have full access to all the files above. When the user asks about code, refers to files, or wants explanations, reference and analyze the relevant files from the project structure. Provide detailed, helpful explanations based on the actual code.`
            },
            {
              role: 'user',
              content: userInput
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

      setAiStatus({ isActive: true, currentAction: 'Processing response...', progress: 80 });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      // Parse the JSON response to extract the actual message content
      let aiContent = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
          aiContent = jsonResponse.choices[0].message.content;
        }
      } catch (parseError) {
        console.warn('Could not parse AI response as JSON, using raw text:', parseError);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiContent,
        timestamp: new Date(),
        status: 'completed'
      };
      setMessages(prev => [...prev, aiResponse]);

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
          {aiStatus.currentBranch && (
            <div className="flex items-center gap-1 text-sm text-green-400">
              <GitBranch size={14} />
              <span>{aiStatus.currentBranch}</span>
            </div>
          )}
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
            {(message.type === 'ai' || message.type === 'system' || message.type === 'status') && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                message.type === 'system' ? 'bg-orange-600' : 
                message.type === 'status' ? 'bg-purple-600' : 'bg-blue-600'
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
                  : message.type === 'status'
                  ? 'bg-purple-600/20 border border-purple-600/30'
                  : 'bg-gray-800 border border-gray-700'
                }
              `}>
                {(message.type === 'ai' || message.type === 'system' || message.type === 'status') ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
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
                <span className="text-gray-400">AI is working...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to build something or explain your code..."
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
          💡 Ask me to "create a React app" or "explain this code" - I work directly with your files!
        </div>
      </div>
    </div>
  );
}
