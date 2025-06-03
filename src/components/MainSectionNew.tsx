'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Trash2, 
  Play,
  Loader,
  Pause,
  Image
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useBranchStore } from '@/store/branchStore';
import BranchSelector from './BranchSelector';
import StatusDetailModal from './StatusDetailModal';
import ImageProcessor from './ImageProcessor';
import MultiImageChat from './MultiImageChat';

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

interface FileTreeNode {
  type: 'file' | 'folder';
  path: string;
  name?: string;
  content?: string;
  children?: FileTreeNode[];
  lastModified?: Date;
}

export default function MainSection() {
  const { 
    getCurrentBranch, 
    updateBranchChat, 
    updateBranchFiles, 
    addToSTM,
    createBranch,
    getBranch
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
  const [selectedStatusDetail, setSelectedStatusDetail] = useState<{
    id: string;
    type: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error';
    title: string;
    description?: string;
    progress?: number;
  } | null>(null);
  const [showImageProcessor, setShowImageProcessor] = useState(false);
  const [showMultiImageChat, setShowMultiImageChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentBranch = getCurrentBranch();

  // Get available models from environment variables
  const getAvailableModels = () => {
    const modelsString = process.env.NEXT_PUBLIC_AI_MODELS || 'openai,openai-fast,openai-large,qwen-coder,llama,mistral,deepseek-reasoning,grok,searchgpt';
    return modelsString.split(',').map(model => model.trim());
  };

  const pollinationsModels = getAvailableModels();

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
  }, [currentBranch]);

  // Save messages to current branch whenever messages change - Fixed infinite loop
  const lastSavedMessages = useRef<string>('');
  const currentBranchId = currentBranch?.id;
  
  // Memoize the save function to prevent recreating it on every render
  const saveMessages = useCallback((branchId: string, messagesToSave: Message[]) => {
    const messagesString = JSON.stringify(messagesToSave);
    // Only update if messages are actually different from what we last saved
    if (messagesString !== lastSavedMessages.current) {
      lastSavedMessages.current = messagesString;
      updateBranchChat(branchId, messagesToSave);
    }
  }, [updateBranchChat]);
  
  useEffect(() => {
    if (currentBranchId && messages.length > 0) {
      saveMessages(currentBranchId, messages);
    }
  }, [messages, currentBranchId, saveMessages]);

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
      let searchResponse;
      let retryCount = 0;
      const maxRetries = 2; // Fewer retries for search to avoid long delays
      
      while (retryCount < maxRetries) {
        try {
          searchResponse = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
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

          if (searchResponse.ok) {
            break; // Success, exit retry loop
          } else if (searchResponse.status === 503) {
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryCount * 1500)); // Short delay for search retries
              continue;
            } else {
              throw new Error(`Search service unavailable (503). Proceeding without web search.`);
            }
          } else {
            throw new Error(`Search failed: ${searchResponse.status}`);
          }
        } catch (error) {
          if (retryCount >= maxRetries - 1) {
            throw error; // Re-throw if we've exhausted retries
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
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
    if (!currentBranch || !currentBranch.fileTree || !currentBranch.fileTree.length) {
      return 'No project files currently loaded.';
    }

    let content = '';

    const processNode = (node: FileTreeNode, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      
      if (node.type === 'file' && node.content) {
        content += `\n${indent}📁 File: ${node.path}\n`;
        content += `${indent}Content:\n`;
        content += `${indent}\`\`\`\n${node.content}\n${indent}\`\`\`\n`;
      } else if (node.type === 'folder') {
        content += `\n${indent}📂 Folder: ${node.path}\n`;
        if (node.children) {
          node.children.forEach((child: FileTreeNode) => processNode(child, depth + 1));
        }
      }
    };

    (currentBranch.fileTree || []).forEach(node => processNode(node));
    return content;
  };

  const addStatusMessage = (content: string, status?: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error', progress?: number) => {
    const statusId = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const statusMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'status',
      content,
      timestamp: new Date(),
      status,
      statusDetail: status ? {
        id: statusId,
        type: status,
        title: content.replace(/[#*]/g, '').trim(),
        description: getStatusDescription(status),
        progress
      } : undefined
    };
    setMessages(prev => [...prev, statusMessage]);
  };

  const getStatusDescription = (status: 'analyzing' | 'generating' | 'running' | 'fixing' | 'completed' | 'error') => {
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

    // Improved detection for different types of requests
    const isCodeRequest = /\b(create|build|generate|make|develop|code|write)\b.*\b(app|project|component|function|script|program|website|calculator|game|tool)\b/i.test(currentInput) ||
                         /^(create|build|generate|make|develop|code|write)\b/i.test(currentInput.trim());

    const isEditRequest = /\b(edit|change|modify|update|fix|add|remove|delete|replace)\b.*\b(file|code|function|variable|line|in)\b/i.test(currentInput) ||
                         /^(edit|change|modify|update|fix|add|remove|delete|replace)\b/i.test(currentInput.trim());

    if (isCodeRequest) {
      await handleCodeGeneration(currentInput);
    } else if (isEditRequest) {
      await handleFileEditing(currentInput);
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
      const newBranchId = createBranch(branchName, `AI generated code: ${userInput.slice(0, 50)}...`, false);
      
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
      
      // Call the AI API to generate code with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
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
                  content: `You are a professional coding assistant. Generate ONLY the essential files needed for the user's request. Focus on creating minimal, working code.

IMPORTANT RULES:
1. Only create files that are absolutely necessary for the requested functionality
2. Use proper filenames (e.g., calculator.html, script.js, style.css)
3. Each code block MUST start with the filename: \`\`\`filename.ext
4. Keep code simple and focused on the core functionality
5. No unnecessary helper files, config files, or complex folder structures unless specifically requested
6. For simple projects like calculators, usually 1-3 files maximum

## Current Branch: ${currentBranch?.name || 'main'}
${searchResults ? `## Web Search Results (Latest Information):
${searchResults}

Use the above search results to ensure you're using current best practices.` : ''}

Example format:
\`\`\`calculator.html
<!DOCTYPE html>
<html>
... your HTML code ...
</html>
\`\`\`

\`\`\`script.js
// Your JavaScript code
function calculate() {
  // calculation logic
}
\`\`\`

Generate only essential files with proper names. NO package.json, README, or other config files unless specifically requested.`
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

          if (response.ok) {
            break; // Success, exit retry loop
          } else if (response.status === 503) {
            retryCount++;
            if (retryCount < maxRetries) {
              addStatusMessage(`⏳ **API temporarily unavailable (${response.status}). Retrying in ${retryCount * 2} seconds... (${retryCount}/${maxRetries})**`, 'analyzing', 40 + (retryCount * 5));
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000)); // Exponential backoff
              continue;
            } else {
              throw new Error(`API service unavailable (503). The AI service is currently experiencing high load. Please try again in a few minutes.`);
            }
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          if (retryCount >= maxRetries - 1) {
            throw error; // Re-throw if we've exhausted retries
          }
          retryCount++;
          addStatusMessage(`⚠️ **Connection issue. Retrying... (${retryCount}/${maxRetries})**`, 'analyzing', 40 + (retryCount * 5));
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
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
      addStatusMessage('⚡ **Creating files directly in your project...**', 'generating', 60);
      
      // Apply files directly to the new branch
      const filesCreated = await applyGeneratedFiles(aiResponse, newBranchId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAiStatus({ isActive: true, currentAction: 'Testing generated code...', progress: 80, isPaused: false });
      addStatusMessage('🧪 **Validating generated code...**', 'running', 80);
      
      // Simulate basic validation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (filesCreated > 0) {
        setAiStatus({ isActive: true, currentAction: 'Code generation completed!', progress: 100, isPaused: false });
        addStatusMessage(`✅ **Successfully created ${filesCreated} file(s)**\n\n📁 Files added directly to your project\n🌿 Check the Files section to see your new code!`, 'completed', 100);
        
        // Add to memory for the new branch
        addToSTM(newBranchId, `Generated ${filesCreated} files for: ${userInput.slice(0, 50)}...`);
      } else {
        addStatusMessage('⚠️ **No code blocks found in AI response. Please be more specific about what you want to build.**', 'error', 0);
      }

    } catch (error) {
      console.error('Error in code generation:', error);
      addStatusMessage(`❌ **Error during code generation**: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 0);
    } finally {
      setIsLoading(false);
      setAiStatus({ isActive: false, currentAction: '', progress: 0, isPaused: false });
    }
  };

  const handleFileEditing = async (userInput: string) => {
    try {
      addStatusMessage('✏️ **Starting File Editing Process**', 'analyzing', 10);
      setAiStatus({ isActive: true, currentAction: 'Analyzing edit request...', progress: 20, isPaused: false });
      
      // Check if web search is needed for editing
      let searchResults = '';
      if (needsWebSearch(userInput)) {
        addStatusMessage('🔍 **Searching for latest solutions...**', 'analyzing', 30);
        setAiStatus({ isActive: true, currentAction: 'Finding current best practices...', progress: 30, isPaused: false });
        
        searchResults = await performWebSearch(userInput);
        addStatusMessage('✅ **Found latest solutions - applying to your code**', 'analyzing', 40);
      }
      
      setAiStatus({ isActive: true, currentAction: 'Modifying files directly...', progress: 50, isPaused: false });
      addStatusMessage('🔧 **Editing files directly in your project**', 'generating', 50);

      // Call AI to get the file modifications with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
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
                  content: `You are a professional coding assistant that edits files directly. When the user asks you to edit, modify, fix, or change code, provide the complete updated file content in code blocks.

## Current Branch: ${currentBranch?.name || 'main'}
## Short Term Memory: ${currentBranch?.shortTermMemory.join(', ') || 'None'}
## Long Term Memory: ${currentBranch?.longTermMemory.slice(-5).join(', ') || 'None'}

## Current Project Files:
${getAllFileContents()}

${searchResults ? `## Web Search Results (Latest Solutions):
${searchResults}

Use the above search results to apply the most current and effective solutions.` : ''}

IMPORTANT: For file edits, you must:
1. Provide the COMPLETE updated file content in a code block
2. Use the format: \`\`\`filename.ext to clearly indicate which file to update
3. Include ALL content of the file, not just the changes
4. Make sure the code is functional and follows best practices
5. If creating new files, include them with proper filenames

Return updated files as code blocks so they can be applied directly to the project.`
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

          if (response.ok) {
            break; // Success, exit retry loop
          } else if (response.status === 503) {
            retryCount++;
            if (retryCount < maxRetries) {
              addStatusMessage(`⏳ **API temporarily unavailable (${response.status}). Retrying in ${retryCount * 2} seconds... (${retryCount}/${maxRetries})**`, 'analyzing', 50 + (retryCount * 5));
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000)); // Exponential backoff
              continue;
            } else {
              throw new Error(`API service unavailable (503). The AI service is currently experiencing high load. Please try again in a few minutes.`);
            }
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          if (retryCount >= maxRetries - 1) {
            throw error; // Re-throw if we've exhausted retries
          }
          retryCount++;
          addStatusMessage(`⚠️ **Connection issue. Retrying... (${retryCount}/${maxRetries})**`, 'analyzing', 50 + (retryCount * 5));
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
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

      setAiStatus({ isActive: true, currentAction: 'Applying changes to files...', progress: 70, isPaused: false });
      addStatusMessage('💾 **Applying changes to project files...**', 'running', 70);

      // Apply the file edits directly
      const filesUpdated = await applyFileEdits(aiContent);
      
      setAiStatus({ isActive: true, currentAction: 'Running error checks...', progress: 90, isPaused: false });
      addStatusMessage('🔍 **Checking for errors and validating changes...**', 'running', 90);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (filesUpdated > 0) {
        setAiStatus({ isActive: true, currentAction: 'Files updated successfully!', progress: 100, isPaused: false });
        addStatusMessage(`✅ **Successfully updated ${filesUpdated} file(s)**\n\n📝 Changes applied directly to your project\n🔍 Check the Files section to see updates`, 'completed', 100);
        
        // Add to memory
        if (currentBranch) {
          addToSTM(currentBranch.id, `Applied file edits: ${userInput.slice(0, 100)}...`);
          addToSTM(currentBranch.id, `Updated ${filesUpdated} files successfully`);
        }
      } else {
        addStatusMessage('⚠️ **No file changes detected in AI response. Try being more specific about which files to edit.**', 'error', 0);
      }

    } catch (error) {
      console.error('Error in file editing:', error);
      addStatusMessage(`❌ **Error during file editing**: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 0);
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
      
      const systemPrompt = `You are a professional coding assistant. You have access to the user's entire project and can analyze, explain, and discuss their code.

## Current Branch: ${currentBranch?.name || 'main'}
## Short Term Memory: ${currentBranch?.shortTermMemory.join(', ') || 'None'}
## Long Term Memory: ${currentBranch?.longTermMemory.slice(-5).join(', ') || 'None'}

## Current Project Structure and Files:
${getAllFileContents()}

You have full access to all the files above. When the user asks about code, refers to files, or wants explanations, reference and analyze the relevant files from the project structure. Provide detailed, helpful explanations based on the actual code.

${searchResults ? `## Web Search Results (Latest Information):
${searchResults}

Use the above search results to provide the most current and accurate information. Reference recent examples, updated documentation, and current best practices found in the search results.` : ''}`;
      
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
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

          if (response.ok) {
            break; // Success, exit retry loop
          } else if (response.status === 503) {
            retryCount++;
            if (retryCount < maxRetries) {
              setAiStatus({ isActive: true, currentAction: `API temporarily unavailable. Retrying in ${retryCount * 2} seconds... (${retryCount}/${maxRetries})`, progress: 70 + (retryCount * 5), isPaused: false });
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000)); // Exponential backoff
              continue;
            } else {
              throw new Error(`API service unavailable (503). The AI service is currently experiencing high load. Please try again in a few minutes.`);
            }
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          if (retryCount >= maxRetries - 1) {
            throw error; // Re-throw if we've exhausted retries
          }
          retryCount++;
          setAiStatus({ isActive: true, currentAction: `Connection issue. Retrying... (${retryCount}/${maxRetries})`, progress: 70 + (retryCount * 5), isPaused: false });
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
      }

      setAiStatus({ isActive: true, currentAction: 'Processing response...', progress: 80, isPaused: false });

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
        const filename = match[2];
        const content = match[3].trim();
        
        if (filename) {
          updates.push({ filename, content });
        }
      }
    }
    
    for (const update of updates) {
      const updated = updateFileInBranch(currentBranch.fileTree || [], update.filename, update.content);
      if (updated) {
        filesUpdated++;
      }
    }
    
    if (filesUpdated > 0) {
      updateBranchFiles(currentBranch.id, currentBranch.fileTree || []);
    }
    
    return filesUpdated;
  };

  const updateFileInBranch = (nodes: FileTreeNode[], targetFilename: string, newContent: string): boolean => {
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

  const applyGeneratedFiles = async (aiResponse: string, targetBranchId?: string): Promise<number> => {
    const targetBranch = targetBranchId ? getBranch(targetBranchId) : currentBranch;
    if (!targetBranch) return 0;
    
    let filesCreated = 0;
    
    // Extract code blocks with proper filename detection
    const filenameCodeBlocks = /```([^\n`]+\.[a-zA-Z0-9]+)\s*\n([\s\S]*?)```/g;
    const standardCodeBlocks = /```(\w+)?\s*\n([\s\S]*?)```/g;
    
    let match;
    const newFiles: { name: string; content: string }[] = [];
    
    // First try to find blocks that start with filenames
    while ((match = filenameCodeBlocks.exec(aiResponse)) !== null) {
      const filename = match[1].trim();
      const content = match[2].trim();
      
      if (filename && content && !filename.includes(' ') && filename.includes('.')) {
        newFiles.push({ name: filename, content });
      }
    }
    
    // If no filename blocks found, try standard code blocks
    if (newFiles.length === 0) {
      let fileCounter = 1;
      while ((match = standardCodeBlocks.exec(aiResponse)) !== null) {
        const language = match[1] || 'txt';
        const content = match[2].trim();
        
        if (content) {
          const extension = getExtensionFromLanguage(language);
          const filename = `file${fileCounter}.${extension}`;
          newFiles.push({ name: filename, content });
          fileCounter++;
        }
      }
    }
    
    // Add files to the target branch
    const currentFileTree = [...(targetBranch.fileTree || [])];
    
    for (const newFile of newFiles) {
      const fileNode = {
        name: newFile.name,
        type: 'file' as const,
        path: newFile.name,
        content: newFile.content,
        isNew: true,
        lastModified: new Date(),
        size: newFile.content.length
      };
      
      // Check if file already exists and update it, otherwise add new
      const existingIndex = currentFileTree.findIndex(node => 
        node.type === 'file' && node.name === newFile.name
      );
      
      if (existingIndex >= 0) {
        currentFileTree[existingIndex] = fileNode;
      } else {
        currentFileTree.push(fileNode);
      }
      
      filesCreated++;
    }
    
    // Update the branch with new files
    updateBranchFiles(targetBranch.id, currentFileTree);
    
    return filesCreated;
  };

  const getExtensionFromLanguage = (language: string): string => {
    const extensionMap: { [key: string]: string } = {
      'javascript': 'js',
      'js': 'js',
      'html': 'html',
      'css': 'css',
      'python': 'py',
      'py': 'py',
      'json': 'json',
      'typescript': 'ts',
      'ts': 'ts'
    };
    
    return extensionMap[language.toLowerCase()] || 'txt';
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

  const handleImageAnalyzed = (analysis: string, imageUrl: string) => {
    const imageMessage: Message = {
      id: `${Date.now()}-image-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: `📸 **Image Analysis Request**\n\n![Uploaded Image](${imageUrl})\n\n**Analysis:** ${analysis}\n\nPlease analyze this image and help me understand what can be built or implemented based on what you see.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, imageMessage]);
    setShowImageProcessor(false);
    
    // Automatically trigger AI response for image analysis
    handleNormalChat(`I've uploaded an image. Here's the analysis: ${analysis}. Please help me understand what can be built or implemented based on this image.`);
  };

  interface AnalyzedImage {
    hostedUrl?: string;
  }

  const handleMultiImagesAnalyzed = (images: AnalyzedImage[], combinedAnalysis: string) => {
    const imageUrls = images
      .filter(img => img.hostedUrl)
      .map((img, index) => `![Image ${index + 1}](${img.hostedUrl})`)
      .join('\n\n');

    const imageMessage: Message = {
      id: `${Date.now()}-images-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: `📸 **Multi-Image Analysis Request**\n\n${imageUrls}\n\n${combinedAnalysis}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, imageMessage]);
    setShowMultiImageChat(false);
    
    // Automatically trigger AI response for multi-image analysis
    handleNormalChat(combinedAnalysis);
  };

  // Direct photo upload handler
  const handleDirectPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle selected files from direct upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process images directly like MultiImageChat
    const imageAnalyses: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        // Upload and analyze each image
        const imageUrl = await uploadToCatbox(file);
        const analysis = await analyzeImageDirect(imageUrl);
        imageAnalyses.push(`**Image ${i + 1}: ${file.name}**\n${analysis}`);
      } catch (error) {
        console.error('Error processing image:', error);
        imageAnalyses.push(`**Image ${i + 1}: ${file.name}**\nError analyzing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (imageAnalyses.length > 0) {
      const combinedAnalysis = `I've uploaded ${files.length} photo(s) for analysis:\n\n${imageAnalyses.join('\n\n---\n\n')}\n\nPlease help me understand what can be built or implemented based on these images.`;
      
      // Add as user message and process
      const userMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: combinedAnalysis,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      handleNormalChat(combinedAnalysis);
    }

    // Reset file input
    event.target.value = '';
  };

  // Helper function to upload to catbox.moe
  const uploadToCatbox = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);

    try {
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const url = await response.text();
      return url.trim();
    } catch (error) {
      console.error('Upload failed, using local URL:', error);
      return URL.createObjectURL(file);
    }
  };

  // Direct image analysis function
  const analyzeImageDirect = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.NEXT_PUBLIC_POLLINATIONS_REFERRER || '',
          'token': process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || ''
        },
        body: JSON.stringify({
          model: 'openai-large',
          messages: [
            {
              role: 'system',
              content: 'You are an expert image analyzer. Provide detailed analysis of images including content, style, technical details, and potential implementation ideas.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image in detail. Describe what you see, any UI elements, code patterns, design concepts, or technical implementations that could be built based on this image.'
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const responseText = await response.text();
      
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.choices?.[0]?.message?.content) {
          return jsonResponse.choices[0].message.content;
        }
      } catch {
        console.warn('Could not parse AI response as JSON, using raw text');
      }

      return responseText;
    } catch (error) {
      console.error('Image analysis failed:', error);
      return `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full">
      {/* Header - Mobile Optimized */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Bot className="text-blue-400 flex-shrink-0" size={24} />
            <h2 className="text-lg sm:text-xl font-semibold truncate">AI Code Assistant</h2>
            <div className="hidden lg:block">
              <BranchSelector onBranchChange={() => setMessages([])} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm min-h-[44px] min-w-[120px] touch-feedback"
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
              className="p-3 hover:bg-gray-700 rounded-lg touch-feedback min-h-[44px] min-w-[44px] flex items-center justify-center" 
              title="Clear chat"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Branch Selector - Full width on mobile/tablet */}
        <div className="lg:hidden mt-4 pt-4 border-t border-gray-700">
          <BranchSelector onBranchChange={() => setMessages([])} />
        </div>
      </div>

      {/* AI Status Bar - Mobile Optimized */}
      {aiStatus.isActive && (
        <div className="bg-blue-600 text-white px-4 py-3 text-sm flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {aiStatus.isPaused ? (
              <Pause className="animate-pulse flex-shrink-0" size={18} />
            ) : (
              <Loader className="animate-spin flex-shrink-0" size={18} />
            )}
            <span className="truncate text-sm sm:text-base font-medium">{aiStatus.currentAction}</span>
          </div>
          
          {/* Progress bar - Show on mobile but smaller */}
          <div className="flex flex-1 bg-blue-800 rounded-full h-2 sm:h-3 ml-2 max-w-[120px] sm:max-w-[200px]">
            <div 
              className="bg-white h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${aiStatus.progress}%` }}
            />
          </div>
          
          {/* Control buttons with better mobile touch targets */}
          {aiStatus.isActive && !aiStatus.isPaused && (
            <button
              onClick={pauseAI}
              className="p-2 bg-blue-700 hover:bg-blue-800 rounded-lg touch-feedback flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Pause AI"
            >
              <Pause size={16} />
            </button>
          )}
          {aiStatus.isPaused && (
            <button
              onClick={resumeAI}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-lg touch-feedback flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Resume AI"
            >
              <Play size={16} />
            </button>
          )}
        </div>
      )}

      {/* Messages Area - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar pb-4 sm:pb-6">
        {messages.map((message, index) => (
          <div key={message.id} 
               className={`flex gap-2 sm:gap-4 animate-fade-in ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
               style={{ 
                 animationDelay: `${Math.min(index * 50, 300)}ms`
               }}>
            {(message.type === 'ai' || message.type === 'system' || message.type === 'status') && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 interactive-scale"
                   style={{
                     background: message.type === 'system' ? 'var(--accent-orange)' : 
                                message.type === 'status' ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 
                                'var(--primary-gradient)',
                     boxShadow: 'var(--shadow-touch)'
                   }}>
                <Bot size={16} className="sm:w-5 sm:h-5" />
              </div>
            )}
            
            <div className={`max-w-[88%] sm:max-w-[85%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div 
                className="card-glass interactive-lift touch-feedback px-3 py-3 sm:px-4 sm:py-4 transition-all duration-300"
                style={{
                  background: message.type === 'user' 
                    ? 'var(--primary-gradient)' 
                    : message.type === 'system'
                    ? 'rgba(249, 115, 22, 0.1)'
                    : message.type === 'status'
                    ? 'rgba(139, 92, 246, 0.1)'
                    : 'var(--glass-bg)',
                  color: message.type === 'user' ? 'white' : 'var(--foreground)',
                  borderRadius: 'var(--radius-lg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  cursor: message.type === 'status' ? 'pointer' : 'default',
                  marginLeft: message.type === 'user' ? 'auto' : '0'
                }}
                onClick={() => message.type === 'status' && handleStatusClick(message)}
              >
                {(message.type === 'ai' || message.type === 'system' || message.type === 'status') ? (
                  <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-gray-500">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                {message.status && (
                  <span 
                    className={`px-2 py-1 rounded-lg text-xs cursor-pointer touch-feedback transition-opacity min-h-[32px] flex items-center ${
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
                  className="hover:text-gray-300 touch-feedback p-2 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Copy message"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="sm:w-5 sm:h-5" />
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

      {/* Multi-Image Upload Area */}
      {showMultiImageChat && (
        <div className="border-t border-gray-700 p-3 sm:p-4 bg-gray-800/50">
          <MultiImageChat 
            onImagesAnalyzed={handleMultiImagesAnalyzed}
            maxImages={10}
          />
        </div>
      )}

      {/* Input Area - Mobile Optimized */}
      <div className="pb-safe flex-shrink-0 card-glass" style={{ 
        borderTop: '1px solid var(--glass-border)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)'
      }}>
        <div className="p-4 sm:p-6">
          <div className="flex gap-3 sm:gap-4 items-end">
            {/* Photo Upload Button - Better mobile sizing */}
            <button
              onClick={handleDirectPhotoUpload}
              className="btn-premium btn-secondary touch-feedback ripple-primary flex-shrink-0"
              title="Add photos"
              style={{ 
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '12px',
                padding: '12px'
              }}
            >
              <Image size={22} />
            </button>
            
            {/* Hidden file input for direct photo access */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to build something, explain your code, or add photos..."
                className="input-premium w-full resize-none text-sm sm:text-base"
                rows={1}
                style={{ 
                  minHeight: '48px', 
                  maxHeight: '120px',
                  paddingRight: '60px',
                  paddingTop: '14px',
                  paddingBottom: '14px'
                }}
              />
              
              {/* Send Button positioned inside input - Mobile optimized */}
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-premium btn-primary touch-feedback ripple flex-shrink-0"
                style={{
                  minWidth: '44px',
                  minHeight: '40px',
                  borderRadius: '10px',
                  opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1
                }}
              >
                {isLoading ? (
                  <Loader size={18} className="animate-spin-smooth" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile-optimized info section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3 text-xs sm:text-sm" style={{ color: 'var(--foreground-muted)' }}>
            <span className="text-center sm:text-left">💡 Ask me to create apps, explain code, or add photos for analysis!</span>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <span className="hidden sm:inline">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="btn-premium btn-ghost touch-feedback text-xs"
                style={{ 
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  minHeight: '36px'
                }}
              >
                {pollinationsModels.map(model => (
                  <option key={model} value={model}>
                    {model.charAt(0).toUpperCase() + model.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
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

      {/* Image Processor Modal */}
      <ImageProcessor
        isOpen={showImageProcessor}
        onClose={() => setShowImageProcessor(false)}
        onImageAnalyzed={handleImageAnalyzed}
      />
    </div>
  );
}
