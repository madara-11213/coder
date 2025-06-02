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
  GitBranch,
  Pause,
  Resume
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useProjectStore } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';
import BranchSelector from './BranchSelector';
import StatusDetailModal from './StatusDetailModal';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system' | 'status';
  content: string;
  timestamp: Date;
  status?: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
  statusDetail?: {
    id: string;
    type: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
    title: string;
    description?: string;
    progress?: number;
  };
}

interface AIStatus {
  isActive: boolean;
  currentAction: string;
  progress: number;
  currentBranch?: string;
  isPaused?: boolean;
}

export default function MainSection() {
  const { generateProjectFromAI } = useProjectStore();
  const { 
    getCurrentBranch, 
    updateBranchChat, 
    updateBranchFiles, 
    addToSTM, 
    addToLTM,
    createBranch 
  } = useBranchStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [aiStatus, setAiStatus] = useState<AIStatus>({ 
    isActive: false, 
    currentAction: '', 
    progress: 0,
    isPaused: false 
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusDetail, setSelectedStatusDetail] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const currentBranch = getCurrentBranch();

  const pollinationsModels = [
    'openai',
    'openai-fast', 
    'openai-large',
    'qwen-coder',
    'llama',
    'mistral',
    'deepseek-reasoning',
    'grok',
    'searchgpt'
  ];

  // Load branch-specific chat history
  useEffect(() => {
    if (currentBranch) {
      if (currentBranch.chatHistory.length > 0) {
        setMessages(currentBranch.chatHistory);
      } else {
        const welcomeMessage: Message = {
          id: 'welcome',
          type: 'ai',
          content: `# Welcome to AI Code Assistant! 🤖

I'm your intelligent coding companion with **real-time web search** capabilities. I can:

## 🔧 **Smart Development**
- **Analyze** your entire codebase
- **Generate** complete projects from descriptions
- **Fix errors** automatically with latest solutions
- **Create branches** for changes

## 🌐 **Web-Enhanced Features**
- **Auto-detect** when current information is needed
- **Search the web** for latest documentation and examples
- **Use real-time data** for error solving and best practices
- **Stay updated** with current technologies and solutions

## 🎯 **How I Work**
- I can see and understand all your project files
- When you ask me to build something, I create a new branch and work directly on files
- I automatically search the web for current examples when needed
- I provide real-time status updates with pause/resume functionality
- Ask me to explain any code - I'll analyze your entire project with latest info

**Current Branch: ${currentBranch.name}**
**Just tell me what you want to build or ask about your code - I'll use the latest web info!**`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [currentBranch?.id]);

  // Save messages to current branch whenever messages change
  useEffect(() => {
    if (currentBranch && messages.length > 0) {
      updateBranchChat(currentBranch.id, messages);
    }
  }, [messages, currentBranch?.id, updateBranchChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pause/Resume AI functionality
  const pauseAI = () => {
    setAiStatus(prev => ({ ...prev, isPaused: true }));
  };

  const resumeAI = () => {
    setAiStatus(prev => ({ ...prev, isPaused: false }));
  };

  // Dynamic web search detection
  const needsWebSearch = (userInput: string): boolean => {
    const searchKeywords = [
      'latest', 'current', 'new', 'recent', 'updated', 'modern',
      'error:', 'bug:', 'issue:', 'problem:', 'fix', 'solve',
      'how to', 'tutorial', 'example', 'documentation',
      'best practices', 'performance', 'optimization',
      'react 18', 'next.js 14', 'typescript 5', 'node.js',
      'compatibility', 'deprecated', 'alternative',
      'library', 'package', 'npm', 'install',
      'stackoverflow', 'github', 'documentation'
    ];
    
    const lowerInput = userInput.toLowerCase();
    return searchKeywords.some(keyword => lowerInput.includes(keyword)) ||
           /error|exception|failed|undefined|null|cannot|does not work/i.test(userInput) ||
           /\b(20|19)\d{2}\b/.test(userInput) || // Year references
           /version|update|upgrade|migrate/i.test(userInput);
  };

  // Perform web search using searchgpt
  const performWebSearch = async (query: string): Promise<string> => {
    const currentDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    try {
      const searchResponse = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || '',
          'token': process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || ''
        },
        body: JSON.stringify({
          model: 'searchgpt',
          messages: [
            {
              role: 'system',
              content: `You are SearchGPT with real-time web search capabilities. Current date and time: ${currentDateTime}

Please search the web for information related to the user's query and provide:
1. Latest/current information from reliable sources
2. Code examples if relevant
3. Best practices and solutions
4. Recent updates or changes
5. Links to documentation, Stack Overflow, GitHub, etc.

Focus on providing accurate, up-to-date information that can help solve coding problems or provide current examples.`
            },
            {
              role: 'user',
              content: `Search for: ${query}

Please find the most current and relevant information, including:
- Latest documentation and examples
- Recent solutions to similar problems
- Current best practices
- Any recent updates or changes
- Working code examples`
            }
          ],
          temperature: 0.3,
          top_p: 0.9,
          seed: Math.floor(Math.random() * 1000000),
          private: true,
          nofeed: true,
          token: process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || '',
          referrer: process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || ''
        })
      });

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`);
      }

      const responseText = await searchResponse.text();
      
      let searchResults = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
          searchResults = jsonResponse.choices[0].message.content;
        }
      } catch (parseError) {
        console.warn('Could not parse search response as JSON, using raw text:', parseError);
      }

      return searchResults;
    } catch (error) {
      console.error('Web search failed:', error);
      return `Unable to perform web search at this time. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  // Function to get all file contents from the current branch
  const getAllFileContents = (): string => {
    if (!currentBranch || !currentBranch.fileTree.length) {
      return 'No project files currently loaded.';
    }

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

    currentBranch.fileTree.forEach(node => processNode(node));
    return content;
  };

  const addStatusMessage = (content: string, status?: string, progress?: number) => {
    const statusId = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const statusMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'status',
      content,
      timestamp: new Date(),
      status: status as any,
      statusDetail: {
        id: statusId,
        type: status as any,
        title: content.replace(/[#*]/g, '').trim(),
        description: getStatusDescription(status as any),
        progress
      }
    };
    setMessages(prev => [...prev, statusMessage]);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'analyzing': return 'AI is analyzing your request and project structure';
      case 'generating': return 'Generating code and creating project files in real-time';
      case 'running': return 'Running tests and validating generated code';
      case 'fixing': return 'Identifying and fixing errors in the code';
      case 'completed': return 'Task completed successfully';
      case 'error': return 'An error occurred during processing';
      default: return 'Processing your request';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setAiStatus({ isActive: true, currentAction: 'Connecting to AI...', progress: 10, isPaused: false });

    // Check if this is a code generation request
    const isCodeRequest = currentInput.toLowerCase().includes('create') || 
                         currentInput.toLowerCase().includes('build') || 
                         currentInput.toLowerCase().includes('generate') ||
                         currentInput.toLowerCase().includes('make');

    if (isCodeRequest) {
      await handleCodeGeneration(currentInput);
    } else {
      await handleNormalChat(currentInput);
    }
  };

  const handleCodeGeneration = async (userInput: string) => {
    try {
      addStatusMessage('🌟 **Starting AI Code Generation**', 'analyzing', 10);
      setAiStatus({ isActive: true, currentAction: 'Creating new branch...', progress: 20, isPaused: false });
      
      // Create a new branch for AI code generation
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-');
      const branchName = `ai-code-${timestamp}`;
      const newBranchId = createBranch(branchName, `AI generated code: ${userInput.slice(0, 50)}...`, true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if web search is needed
      let searchResults = '';
      if (needsWebSearch(userInput)) {
        addStatusMessage('🔍 **Searching the web for latest information...**', 'analyzing', 30);
        setAiStatus({ isActive: true, currentAction: 'Searching web for current examples...', progress: 30, isPaused: false });
        
        searchResults = await performWebSearch(userInput);
        addStatusMessage('✅ **Web search completed - using latest information**', 'analyzing', 35);
      }
      
      addStatusMessage(`📝 **Created new branch: ${branchName}**`, 'generating', 40);
      setAiStatus({ isActive: true, currentAction: 'Generating code with latest info...', progress: 40, currentBranch: branchName, isPaused: false });
      
      // Call the AI API to generate code
      const response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || '',
          'token': process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || ''
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: `You are a professional coding assistant. Generate complete, working code based on the user's request. Provide well-structured, commented code that follows best practices. Include all necessary files for a complete project.

## Current Branch: ${currentBranch?.name || 'main'}
## Short Term Memory: ${currentBranch?.shortTermMemory.join(', ') || 'None'}
## Long Term Memory: ${currentBranch?.longTermMemory.slice(-3).join(', ') || 'None'}

## Current Project Context:
${getAllFileContents()}

${searchResults ? `## Web Search Results (Latest Information):
${searchResults}

Use the above search results to ensure you're using the most current and best practices. Incorporate any relevant examples, solutions, or updated approaches found in the search results.` : ''}

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
          token: process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || '',
          referrer: process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      let aiResponse = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
          aiResponse = jsonResponse.choices[0].message.content;
        }
      } catch (parseError) {
        console.warn('Could not parse AI response as JSON, using raw text:', parseError);
      }

      setAiStatus({ isActive: true, currentAction: 'Creating project files...', progress: 60, isPaused: false });
      addStatusMessage('⚡ **Generating project structure...**', 'generating', 60);
      
      // Generate the actual project
      const project = await generateProjectFromAI(aiResponse);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAiStatus({ isActive: true, currentAction: 'Testing generated code...', progress: 80, isPaused: false });
      addStatusMessage('🧪 **Running tests and validations...**', 'running', 80);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (project) {
        setAiStatus({ isActive: true, currentAction: 'Code generation completed!', progress: 100, isPaused: false });
        addStatusMessage(`✅ **Successfully created project: ${project.name}**\n\n📁 Generated ${project.files.length} files\n🌿 Project available in Files section`, 'completed', 100);
      } else {
        addStatusMessage('⚠️ **No code blocks found in AI response. Try being more specific about what you want to build.**', 'error', 0);
      }

    } catch (error) {
      console.error('Error in code generation:', error);
      addStatusMessage(`❌ **Error during code generation**: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 0);
    } finally {
      setIsLoading(false);
      setAiStatus({ isActive: false, currentAction: '', progress: 0, isPaused: false });
    }
  };

  const handleNormalChat = async (userInput: string) => {
    try {
      setAiStatus({ isActive: true, currentAction: 'Analyzing your question...', progress: 30, isPaused: false });
      
      // Check if web search is needed for chat responses
      let searchResults = '';
      if (needsWebSearch(userInput)) {
        addStatusMessage('🔍 **Searching the web for latest information...**', 'analyzing', 40);
        setAiStatus({ isActive: true, currentAction: 'Searching web for current info...', progress: 40, isPaused: false });
        
        searchResults = await performWebSearch(userInput);
        addStatusMessage('✅ **Web search completed - providing updated answer**', 'analyzing', 50);
      }
      
      const isEditRequest = userInput.toLowerCase().includes('edit') ||
                           userInput.toLowerCase().includes('change') || 
                           userInput.toLowerCase().includes('modify') || 
                           userInput.toLowerCase().includes('update') || 
                           userInput.toLowerCase().includes('fix') ||
                           userInput.toLowerCase().includes('add to') ||
                           userInput.toLowerCase().includes('remove from');

      const systemPrompt = isEditRequest ? 
        `You are a professional coding assistant. When the user asks you to edit, modify, or change files, you should provide the updated code in properly formatted code blocks.

## Current Branch: ${currentBranch?.name || 'main'}
## Short Term Memory: ${currentBranch?.shortTermMemory.join(', ') || 'None'}
## Long Term Memory: ${currentBranch?.longTermMemory.slice(-5).join(', ') || 'None'}

## Current Project Structure and Files:
${getAllFileContents()}

When editing files:
1. Provide the complete updated file content in a code block
2. Use the format: \`\`\`filename.ext to clearly indicate which file to update
3. Include ALL content of the file, not just the changes
4. Make sure the code is functional and follows best practices` :
        `You are a professional coding assistant. You have access to the user's entire project and can analyze, explain, and discuss their code.

## Current Branch: ${currentBranch?.name || 'main'}
## Short Term Memory: ${currentBranch?.shortTermMemory.join(', ') || 'None'}
## Long Term Memory: ${currentBranch?.longTermMemory.slice(-5).join(', ') || 'None'}

## Current Project Structure and Files:
${getAllFileContents()}

You have full access to all the files above. When the user asks about code, refers to files, or wants explanations, reference and analyze the relevant files from the project structure. Provide detailed, helpful explanations based on the actual code.

${searchResults ? `## Web Search Results (Latest Information):
${searchResults}

Use the above search results to provide the most current and accurate information. Reference recent examples, updated documentation, and current best practices found in the search results.` : ''}`;
      
      const response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || '',
          'token': process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || ''
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt
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
          token: process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || '',
          referrer: process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || ''
        })
      });

      setAiStatus({ isActive: true, currentAction: 'Processing response...', progress: 80, isPaused: false });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      let aiContent = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
          aiContent = jsonResponse.choices[0].message.content;
        }
      } catch (parseError) {
        console.warn('Could not parse AI response as JSON, using raw text:', parseError);
      }

      // If this was an edit request, try to apply the changes directly to files
      if (isEditRequest && currentBranch) {
        setAiStatus({ isActive: true, currentAction: 'Applying file changes...', progress: 90, isPaused: false });
        const filesUpdated = await applyFileEdits(aiContent);
        
        if (filesUpdated > 0) {
          addStatusMessage(`✅ **Updated ${filesUpdated} file(s) directly**`, 'completed', 100);
          addToSTM(currentBranch.id, `Applied edits to ${filesUpdated} files`);
        }
      }

      const aiResponse: Message = {
        id: `${Date.now()}-ai-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai',
        content: aiContent,
        timestamp: new Date(),
        status: 'completed'
      };
      setMessages(prev => [...prev, aiResponse]);
      
      if (currentBranch) {
        addToSTM(currentBranch.id, `User asked: ${userInput.slice(0, 100)}...`);
        addToSTM(currentBranch.id, `AI explained: ${aiContent.slice(0, 100)}...`);
      }

    } catch (error) {
      console.error('Error calling AI API:', error);
      const errorResponse: Message = {
        id: `${Date.now()}-error-${Math.random().toString(36).substr(2, 9)}`,
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
      setAiStatus({ isActive: false, currentAction: '', progress: 0, isPaused: false });
    }
  };

  const applyFileEdits = async (aiResponse: string): Promise<number> => {
    if (!currentBranch) return 0;
    
    let filesUpdated = 0;
    
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+\.[\w]+))?\s*\n([\s\S]*?)```/g;
    const filenameRegex = /```([^`\n]+)\n([\s\S]*?)```/g;
    
    let match;
    const updates: { filename: string; content: string }[] = [];
    
    while ((match = filenameRegex.exec(aiResponse)) !== null) {
      const potentialFilename = match[1].trim();
      const content = match[2].trim();
      
      if (potentialFilename.includes('.') && !potentialFilename.includes(' ')) {
        updates.push({ filename: potentialFilename, content });
      }
    }
    
    if (updates.length === 0) {
      while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
        const language = match[1] || '';
        const filename = match[2];
        const content = match[3].trim();
        
        if (filename) {
          updates.push({ filename, content });
        }
      }
    }
    
    for (const update of updates) {
      const updated = updateFileInBranch(currentBranch.fileTree, update.filename, update.content);
      if (updated) {
        filesUpdated++;
      }
    }
    
    if (filesUpdated > 0) {
      updateBranchFiles(currentBranch.id, currentBranch.fileTree);
    }
    
    return filesUpdated;
  };

  const updateFileInBranch = (nodes: any[], targetFilename: string, newContent: string): boolean => {
    for (const node of nodes) {
      if (node.type === 'file' && (node.name === targetFilename || node.path.endsWith(targetFilename))) {
        node.content = newContent;
        node.lastModified = new Date();
        return true;
      }
      if (node.children && node.type === 'folder') {
        if (updateFileInBranch(node.children, targetFilename, newContent)) {
          return true;
        }
      }
    }
    return false;
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearChat = () => {
    setMessages(messages.slice(0, 1));
  };

  const handleStatusClick = (message: Message) => {
    if (message.statusDetail) {
      setSelectedStatusDetail(message.statusDetail);
      setShowStatusModal(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Bot className="text-blue-400 flex-shrink-0" size={20} />
            <h2 className="text-base sm:text-lg font-semibold truncate">AI Code Assistant</h2>
            <div className="hidden lg:block">
              <BranchSelector onBranchChange={() => setMessages([])} />
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-1 sm:px-2 py-1 text-xs sm:text-sm w-24 sm:w-auto"
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
          </div>
        </div>
        
        {/* Branch Selector - Full width on mobile/tablet */}
        <div className="lg:hidden mt-3 pt-3 border-t border-gray-700">
          <BranchSelector onBranchChange={() => setMessages([])} />
        </div>
      </div>

      {/* AI Status Bar */}
      {aiStatus.isActive && (
        <div className="bg-blue-600 text-white px-3 sm:px-4 py-2 text-sm flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {aiStatus.isPaused ? (
              <Pause className="animate-pulse flex-shrink-0" size={16} />
            ) : (
              <Loader className="animate-spin flex-shrink-0" size={16} />
            )}
            <span className="truncate">{aiStatus.currentAction}</span>
          </div>
          <div className="hidden sm:flex flex-1 bg-blue-800 rounded-full h-2 ml-2 max-w-[200px]">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${aiStatus.progress}%` }}
            />
          </div>
          {aiStatus.isActive && !aiStatus.isPaused && (
            <button
              onClick={pauseAI}
              className="ml-2 p-1 bg-blue-700 hover:bg-blue-800 rounded text-xs flex-shrink-0"
              title="Pause AI"
            >
              <Pause size={14} />
            </button>
          )}
          {aiStatus.isPaused && (
            <button
              onClick={resumeAI}
              className="ml-2 p-1 bg-green-600 hover:bg-green-700 rounded text-xs flex-shrink-0"
              title="Resume AI"
            >
              <Play size={14} />
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 sm:gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {(message.type === 'ai' || message.type === 'system' || message.type === 'status') && (
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                message.type === 'system' ? 'bg-orange-600' : 
                message.type === 'status' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                <Bot size={14} className="sm:w-4 sm:h-4" />
              </div>
            )}
            
            <div className={`max-w-[85%] sm:max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div 
                className={`
                  rounded-lg px-3 py-2 sm:px-4 sm:py-3 
                  ${message.type === 'user' 
                    ? 'bg-blue-600 text-white ml-auto' 
                    : message.type === 'system'
                    ? 'bg-orange-600/20 border border-orange-600/30'
                    : message.type === 'status'
                    ? 'bg-purple-600/20 border border-purple-600/30 cursor-pointer hover:bg-purple-600/30 transition-colors'
                    : 'bg-gray-800 border border-gray-700'
                  }
                `}
                onClick={() => message.type === 'status' && handleStatusClick(message)}
              >
                {(message.type === 'ai' || message.type === 'system' || message.type === 'status') ? (
                  <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{message.timestamp.toLocaleTimeString()}</span>
                {message.status && (
                  <span 
                    className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                      message.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                      message.status === 'error' ? 'bg-red-600/20 text-red-400' :
                      'bg-yellow-600/20 text-yellow-400'
                    }`}
                    onClick={() => handleStatusClick(message)}
                    title="Click to view details"
                  >
                    {message.status} {message.type === 'status' && '🔍'}
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
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="sm:w-4 sm:h-4" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="sm:w-4 sm:h-4" />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-gray-400 text-sm sm:text-base">AI is working...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-3 sm:p-4 pb-safe flex-shrink-0">
        <div className="flex gap-2 sm:gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to build something or explain your code..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 sm:px-4 sm:py-2 resize-none focus:outline-none focus:border-blue-500 text-sm sm:text-base"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg px-3 py-2 sm:px-4 sm:py-2 transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 px-1">
          💡 Ask me to "create a React app" or "explain this code" - I work directly with your files!
        </div>
      </div>

      {/* Status Detail Modal */}
      {selectedStatusDetail && (
        <StatusDetailModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedStatusDetail(null);
          }}
          status={selectedStatusDetail}
        />
      )}
    </div>
  );
}
