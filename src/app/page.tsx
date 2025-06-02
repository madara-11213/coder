'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorerNew';
import MainSection from '@/components/MainSectionNew';
import Settings from '@/components/Settings';
import { useProjectStore } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';

export default function Home() {
  const [activeView, setActiveView] = useState<'main' | 'files' | 'settings'>('main');
  const { selectedFile, setSelectedFile } = useProjectStore();
  const { getCurrentBranch } = useBranchStore();

  const renderMainContent = () => {
    const currentBranch = getCurrentBranch();
    
    switch (activeView) {
      case 'main':
        return <MainSection />;
      case 'files':
        return <ProjectExplorer onFileSelect={setSelectedFile} currentBranch={currentBranch} />;
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
