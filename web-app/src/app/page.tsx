'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorer';
import CodeEditor from '@/components/CodeEditor';
import AIChatPanel from '@/components/AIChatPanel';
import Terminal from '@/components/Terminal';
import Settings from '@/components/Settings';

export default function Home() {
  const [activeView, setActiveView] = useState<'explorer' | 'editor' | 'chat' | 'terminal' | 'settings'>('explorer');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const renderMainContent = () => {
    switch (activeView) {
      case 'explorer':
        return <ProjectExplorer onFileSelect={setSelectedFile} />;
      case 'editor':
        return <CodeEditor selectedFile={selectedFile} />;
      case 'chat':
        return <AIChatPanel />;
      case 'terminal':
        return <Terminal />;
      case 'settings':
        return <Settings />;
      default:
        return <ProjectExplorer onFileSelect={setSelectedFile} />;
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
