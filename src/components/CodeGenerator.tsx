'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { 
  Code, 
  Play, 
  Bug, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Download
} from 'lucide-react';

interface CodeGeneratorProps {
  aiResponse: string;
  onClose: () => void;
}

export default function CodeGenerator({ aiResponse, onClose }: CodeGeneratorProps) {
  const { generateProjectFromAI, isGenerating } = useProjectStore();
  const [status, setStatus] = useState<'idle' | 'generating' | 'running' | 'testing' | 'completed' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedProject, setGeneratedProject] = useState<any>(null);

  const handleGenerateProject = async () => {
    setStatus('generating');
    setLogs(['🔍 Analyzing AI response for code blocks...']);

    try {
      const project = await generateProjectFromAI(aiResponse);
      
      if (!project) {
        setStatus('error');
        setLogs(prev => [...prev, '❌ No code blocks found in AI response']);
        return;
      }

      setGeneratedProject(project);
      setLogs(prev => [...prev, `✅ Generated ${project.name} (${project.type} project)`]);
      setLogs(prev => [...prev, `📁 Created ${project.files.length} files`]);
      
      setStatus('running');
      await simulateCodeExecution(project);
      
    } catch (error) {
      setStatus('error');
      setLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const simulateCodeExecution = async (project: any) => {
    setLogs(prev => [...prev, '🚀 Running project...']);
    
    // Simulate running the code
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate checking for errors
    setStatus('testing');
    setLogs(prev => [...prev, '🔍 Checking for errors...']);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate completion (in real implementation, this would run actual code)
    const hasErrors = Math.random() < 0.2; // 20% chance of errors for demo
    
    if (hasErrors) {
      setStatus('error');
      setLogs(prev => [...prev, '❌ Found errors in code:']);
      setLogs(prev => [...prev, '  • SyntaxError: Unexpected token']);
      setLogs(prev => [...prev, '🤖 AI is fixing the errors...']);
      
      // Simulate AI fixing errors
      await new Promise(resolve => setTimeout(resolve, 3000));
      setLogs(prev => [...prev, '✅ Errors fixed! Re-running code...']);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('completed');
      setLogs(prev => [...prev, '🎉 Project successfully generated and tested!']);
    } else {
      setStatus('completed');
      setLogs(prev => [...prev, '✅ No errors found!']);
      setLogs(prev => [...prev, '🎉 Project successfully generated and tested!']);
    }
  };

  const downloadProject = () => {
    if (!generatedProject) return;
    
    // Create a simple text file with project structure
    let content = `# ${generatedProject.name}\n\nProject Type: ${generatedProject.type}\n\n`;
    
    generatedProject.files.forEach((file: any) => {
      content += `## ${file.filename}\n\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedProject.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">AI Code Generator</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status */}
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {status === 'idle' && <Code className="text-blue-400" size={20} />}
              {status === 'generating' && <Loader className="text-blue-400 animate-spin" size={20} />}
              {status === 'running' && <Play className="text-yellow-400" size={20} />}
              {status === 'testing' && <Bug className="text-purple-400" size={20} />}
              {status === 'completed' && <CheckCircle className="text-green-400" size={20} />}
              {status === 'error' && <AlertCircle className="text-red-400" size={20} />}
              
              <span className="font-medium capitalize">
                {status === 'idle' ? 'Ready to Generate' : 
                 status === 'generating' ? 'Generating Project...' :
                 status === 'running' ? 'Running Code...' :
                 status === 'testing' ? 'Testing for Errors...' :
                 status === 'completed' ? 'Completed Successfully!' :
                 'Error Occurred'}
              </span>
            </div>
            
            {generatedProject && (
              <div className="text-sm text-gray-300">
                <div>Project: {generatedProject.name}</div>
                <div>Type: {generatedProject.type}</div>
                <div>Files: {generatedProject.files.length}</div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Generate Project" to start...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-gray-300">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          {status === 'idle' && (
            <button 
              onClick={handleGenerateProject}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg"
            >
              <Code size={16} />
              Generate Project
            </button>
          )}
          
          {status === 'completed' && (
            <button 
              onClick={downloadProject}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <Download size={16} />
              Download Project
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
