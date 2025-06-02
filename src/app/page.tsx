'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorer';
import MainSection from '@/components/MainSection';
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
    <div className="flex h-screen w-screen">
      {/* Sidebar Navigation */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  );
}
