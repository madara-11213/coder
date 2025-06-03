'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorerNew';
import MainSection from '@/components/MainSectionNew';
import FileEditor from '@/components/FileEditor';
import Settings from '@/components/Settings';
import { useProjectStore } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';

export default function Home() {
  const [activeView, setActiveView] = useState<'main' | 'files' | 'settings'>('main');
  const [messageCount, setMessageCount] = useState(0);
  const { selectedFile, setSelectedFile, updateFileContent } = useProjectStore();
  const { getCurrentBranch, updateBranchFiles } = useBranchStore();

  // Get current branch and message count
  const currentBranch = getCurrentBranch();
  
  useEffect(() => {
    if (currentBranch?.chatHistory) {
      setMessageCount(Math.max(0, currentBranch.chatHistory.length - 1)); // Subtract 1 for welcome message
    }
  }, [currentBranch?.chatHistory?.length]);

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
    
    // If a file is selected in files view, show appropriate layout based on screen size
    if (activeView === 'files' && selectedFile) {
      return (
        <>
          {/* Desktop: Side-by-side layout */}
          <div className="hidden sm:flex flex-1 overflow-hidden">
            <ProjectExplorer onFileSelect={handleFileSelect} currentBranch={currentBranch} />
            <FileEditor 
              filePath={selectedFile} 
              onClose={handleFileClose} 
              onSave={handleFileSave}
            />
          </div>
          
          {/* Mobile: Full-screen file editor only */}
          <div className="sm:hidden flex-1 overflow-hidden">
            <FileEditor 
              filePath={selectedFile} 
              onClose={handleFileClose} 
              onSave={handleFileSave}
            />
          </div>
        </>
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
        
        {/* Mobile Bottom Navigation - Advanced Touch-Optimized */}
        <div className="sm:hidden border-t border-gray-700 bg-gray-800/95 backdrop-blur-lg pb-safe">
          <div className="flex justify-center">
            <div className="flex bg-gray-900/50 rounded-full mx-4 my-2 p-1 backdrop-blur-md border border-gray-600/50">
              {[
                { id: 'main' as const, label: 'Chat', icon: '💬', badge: messageCount > 0 ? messageCount : null },
                { id: 'files' as const, label: 'Files', icon: '📁', badge: selectedFile ? '•' : null },
                { id: 'settings' as const, label: 'Settings', icon: '⚙️', badge: null }
              ].map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`
                    relative flex flex-col items-center justify-center 
                    min-w-[64px] min-h-[48px] px-4 py-2 
                    rounded-full transition-all duration-200 
                    touch-feedback ripple
                    ${activeView === item.id 
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50 active:bg-gray-600'
                    }
                  `}
                  style={{ 
                    transform: activeView === item.id ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
                    boxShadow: activeView === item.id ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none'
                  }}
                >
                  <div className="text-lg leading-none">{item.icon}</div>
                  <div className="text-xs mt-0.5 font-medium">{item.label}</div>
                  
                  {/* Badge/Indicator */}
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full px-1">
                      {item.badge}
                    </div>
                  )}
                  
                  {/* Active Indicator */}
                  {activeView === item.id && (
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
