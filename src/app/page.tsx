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
  const { selectedFile, setSelectedFile } = useProjectStore();
  const { getCurrentBranch, updateBranchFiles } = useBranchStore();

  // Get current branch and message count
  const currentBranch = getCurrentBranch();
  
  useEffect(() => {
    if (currentBranch?.chatHistory) {
      setMessageCount(Math.max(0, currentBranch.chatHistory.length - 1)); // Subtract 1 for welcome message
    }
  }, [currentBranch?.chatHistory]);

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
    interface FileNode {
      name: string;
      path: string;
      type: 'file' | 'folder';
      content?: string;
      children?: FileNode[];
      expanded?: boolean;
      size?: number;
      lastModified?: Date;
      isNew?: boolean;
    }
    
    const updateNode = (nodes: FileNode[]): FileNode[] => {
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
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--background)' }}>
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
        className="flex-1 flex flex-col overflow-hidden relative swipeable momentum-scroll custom-scrollbar"
      >
        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 z-50 card-glass text-center py-3 animate-slide-down" 
               style={{ 
                 background: 'var(--primary-gradient)', 
                 borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                 backdropFilter: 'var(--backdrop-blur-heavy)'
               }}>
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-smooth"></div>
              <span className="text-sm font-semibold text-white">Refreshing...</span>
            </div>
          </div>
        )}
        
        {/* View Transition Indicator */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-40 sm:hidden">
          <div className="flex gap-2 card-glass px-3 py-1.5" style={{ borderRadius: 'var(--radius-full)' }}>
            {viewOrder.map((view) => (
              <div
                key={view}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  view === activeView 
                    ? 'w-6 animate-glow-pulse' 
                    : 'w-1.5 opacity-60'
                }`}
                style={{
                  background: view === activeView ? 'var(--primary-gradient)' : 'var(--foreground-muted)'
                }}
              />
            ))}
          </div>
        </div>
        
        {renderMainContent()}
        
        {/* Mobile Bottom Navigation - Premium Glass Design */}
        <div className="sm:hidden pb-safe" 
             style={{ 
               background: 'var(--glass-bg)',
               backdropFilter: 'var(--backdrop-blur-heavy)',
               borderTop: '1px solid var(--glass-border)'
             }}>
          <div className="flex justify-center p-4">
            <div className="flex card-glass-heavy rounded-full p-2">
              {[
                { id: 'main' as const, label: 'Chat', icon: '💬', badge: messageCount > 0 ? messageCount : null },
                { id: 'files' as const, label: 'Files', icon: '📁', badge: selectedFile ? '•' : null },
                { id: 'settings' as const, label: 'Settings', icon: '⚙️', badge: null }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`
                    relative flex flex-col items-center justify-center 
                    min-w-[72px] min-h-[56px] px-4 py-3 mx-1
                    transition-all duration-300 
                    touch-feedback ripple-primary interactive-lift
                    ${activeView === item.id 
                      ? 'text-white' 
                      : 'hover:text-white active:scale-95'
                    }
                  `}
                  style={{ 
                    borderRadius: 'var(--radius-full)',
                    background: activeView === item.id ? 'var(--primary-gradient)' : 'transparent',
                    color: activeView === item.id ? 'white' : 'var(--foreground-secondary)',
                    transform: activeView === item.id ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)',
                    boxShadow: activeView === item.id ? 'var(--shadow-floating), var(--shadow-glow)' : 'none'
                  }}
                >
                  <div className="text-xl leading-none mb-1">{item.icon}</div>
                  <div className="text-xs font-semibold">{item.label}</div>
                  
                  {/* Badge/Indicator */}
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 min-w-[20px] h-6 flex items-center justify-center rounded-full px-2 text-xs font-bold animate-pulse-premium"
                         style={{ 
                           background: '#ef4444', 
                           color: 'white',
                           boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                         }}>
                      {item.badge}
                    </div>
                  )}
                  
                  {/* Active Indicator */}
                  {activeView === item.id && (
                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full animate-pulse-premium"
                         style={{ background: 'var(--primary)' }}></div>
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
