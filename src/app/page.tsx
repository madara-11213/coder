'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectExplorer from '@/components/ProjectExplorerNew';
import MainSection from '@/components/MainSectionNew';
import FileEditor from '@/components/FileEditor';
import Settings from '@/components/Settings';
import { useProjectStore } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';
import { useSwipeGestures, usePullToRefresh } from '@/hooks/useSwipeGestures';

export default function Home() {
  const [activeView, setActiveView] = useState<'main' | 'files' | 'settings'>('main');
  const [messageCount, setMessageCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { selectedFile, setSelectedFile, updateFileContent } = useProjectStore();
  const { getCurrentBranch, updateBranchFiles } = useBranchStore();

  // Get current branch and message count
  const currentBranch = getCurrentBranch();
  
  useEffect(() => {
    if (currentBranch?.chatHistory) {
      setMessageCount(Math.max(0, currentBranch.chatHistory.length - 1)); // Subtract 1 for welcome message
    }
  }, [currentBranch?.chatHistory?.length]);

  // View navigation order for swipe gestures
  const viewOrder: ('main' | 'files' | 'settings')[] = ['main', 'files', 'settings'];
  
  const navigateToView = (direction: 'next' | 'prev') => {
    const currentIndex = viewOrder.indexOf(activeView);
    let newIndex: number;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % viewOrder.length;
    } else {
      newIndex = (currentIndex - 1 + viewOrder.length) % viewOrder.length;
    }
    
    setActiveView(viewOrder[newIndex]);
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate refresh action - in real app this would refresh data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsRefreshing(false);
  };

  // Set up swipe gestures for main content area
  const swipeRef = useSwipeGestures<HTMLDivElement>({
    onSwipeLeft: () => navigateToView('next'),
    onSwipeRight: () => navigateToView('prev'),
    threshold: 100
  });

  // Set up pull-to-refresh for main content
  const refreshRef = usePullToRefresh<HTMLDivElement>(handleRefresh, 80);

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
      
      {/* Main Content Area with Swipe Gestures */}
      <div 
        ref={(el) => {
          if (el) {
            swipeRef.current = el;
            refreshRef.current = el;
          }
        }}
        className="flex-1 flex flex-col overflow-hidden relative swipeable momentum-scroll"
      >
        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600/90 backdrop-blur-sm text-white text-center py-2 animate-slide-down">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-mobile"></div>
              <span className="text-sm font-medium">Refreshing...</span>
            </div>
          </div>
        )}
        
        {/* View Transition Indicator */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 sm:hidden">
          <div className="flex gap-1">
            {viewOrder.map((view, index) => (
              <div
                key={view}
                className={`w-2 h-1 rounded-full transition-all duration-200 ${
                  view === activeView 
                    ? 'bg-blue-400 w-4' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
        
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
