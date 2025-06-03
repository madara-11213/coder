'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorerNew';
import MainSection from '@/components/MainSectionNew';
import FileEditor from '@/components/FileEditor';
import Settings from '@/components/Settings';
import { useProjectStore } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';

export default function Home() {
  const [activeView, setActiveView] = useState<'main' | 'files' | 'settings'>('main');
  const { selectedFile, setSelectedFile, updateFileContent } = useProjectStore();
  const { getCurrentBranch, updateBranchFiles } = useBranchStore();

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    setActiveView('files');
  };

  const handleFileClose = () => {
    setSelectedFile(null);
  };

  const handleFileSave = (filePath: string, content: string) => {
    const currentBranch = getCurrentBranch();
    if (!currentBranch) return;

    // Update file content in the current branch
    const updateNode = (nodes: any[]): any[] => {
      return nodes.map(node => {
        if (node.path === filePath && node.type === 'file') {
          return { ...node, content, lastModified: new Date() };
        }
        if (node.children && node.type === 'folder') {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    const updatedFileTree = updateNode(currentBranch.fileTree || []);
    updateBranchFiles(currentBranch.id, updatedFileTree);
  };

  const renderMainContent = () => {
    const currentBranch = getCurrentBranch();
    
    // If a file is selected in files view, show the file editor
    if (activeView === 'files' && selectedFile) {
      return (
        <div className="flex flex-1 overflow-hidden">
          <ProjectExplorer onFileSelect={handleFileSelect} currentBranch={currentBranch} />
          <FileEditor 
            filePath={selectedFile} 
            onClose={handleFileClose} 
            onSave={handleFileSave}
          />
        </div>
      );
    }
    
    switch (activeView) {
      case 'main':
        return <MainSection />;
      case 'files':
        return <ProjectExplorer onFileSelect={handleFileSelect} currentBranch={currentBranch} />;
      case 'settings':
        return <Settings />;
      default:
        return <MainSection />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden sm:block">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderMainContent()}
        
        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden border-t border-gray-700 bg-gray-800">
          <div className="flex">
            {[
              { id: 'main' as const, label: 'Chat', icon: '💬' },
              { id: 'files' as const, label: 'Files', icon: '📁' },
              { id: 'settings' as const, label: 'Settings', icon: '⚙️' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex-1 px-3 py-3 text-center transition-colors ${
                  activeView === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <div className="text-lg">{item.icon}</div>
                <div className="text-xs mt-1">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
