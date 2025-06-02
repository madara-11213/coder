'use client';

import { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Plus, 
  FolderPlus, 
  Upload,
  Download,
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
  content?: string;
}

interface ProjectExplorerProps {
  onFileSelect: (filePath: string) => void;
}

export default function ProjectExplorer({ onFileSelect }: ProjectExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Initialize with some sample projects
  useEffect(() => {
    const sampleProjects: FileNode[] = [
      {
        name: 'my-react-app',
        type: 'folder',
        path: 'my-react-app',
        expanded: true,
        children: [
          {
            name: 'src',
            type: 'folder',
            path: 'my-react-app/src',
            expanded: true,
            children: [
              { name: 'App.js', type: 'file', path: 'my-react-app/src/App.js' },
              { name: 'index.js', type: 'file', path: 'my-react-app/src/index.js' },
              { name: 'App.css', type: 'file', path: 'my-react-app/src/App.css' },
            ]
          },
          { name: 'package.json', type: 'file', path: 'my-react-app/package.json' },
          { name: 'README.md', type: 'file', path: 'my-react-app/README.md' },
        ]
      },
      {
        name: 'python-scripts',
        type: 'folder',
        path: 'python-scripts',
        children: [
          { name: 'main.py', type: 'file', path: 'python-scripts/main.py' },
          { name: 'utils.py', type: 'file', path: 'python-scripts/utils.py' },
          { name: 'requirements.txt', type: 'file', path: 'python-scripts/requirements.txt' },
        ]
      }
    ];
    setFileTree(sampleProjects);
  }, []);

  const toggleFolder = (path: string) => {
    setFileTree(prev => 
      prev.map(node => updateNodeExpansion(node, path))
    );
  };

  const updateNodeExpansion = (node: FileNode, targetPath: string): FileNode => {
    if (node.path === targetPath && node.type === 'folder') {
      return { ...node, expanded: !node.expanded };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeExpansion(child, targetPath))
      };
    }
    return node;
  };

  const handleFileSelect = (filePath: string) => {
    onFileSelect(filePath);
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const indent = depth * 16;
    
    return (
      <div key={node.path}>
        <div 
          className={`
            flex items-center px-2 py-1 hover:bg-gray-700 cursor-pointer select-none
            ${node.type === 'file' ? 'hover:bg-blue-600/20' : ''}
          `}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              handleFileSelect(node.path);
            }
          }}
        >
          {node.type === 'folder' && (
            <span className="mr-1">
              {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          
          {node.type === 'folder' ? (
            <Folder size={16} className="mr-2 text-blue-400" />
          ) : (
            <File size={16} className="mr-2 text-gray-400" />
          )}
          
          <span className="text-sm truncate">{node.name}</span>
        </div>
        
        {node.type === 'folder' && node.expanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            onClick={() => {/* Create new project */}}
          >
            <Plus size={14} />
            New Project
          </button>
          
          <button 
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            onClick={() => {/* Upload project */}}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FolderPlus size={48} className="mx-auto mb-2 opacity-50" />
            <p>No projects yet</p>
            <p className="text-sm">Create or upload a project to get started</p>
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map(node => renderFileNode(node))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <button 
          className="flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="New File"
        >
          <File size={14} />
        </button>
        
        <button 
          className="flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="New Folder"
        >
          <FolderPlus size={14} />
        </button>
        
        <button 
          className="flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Download Project"
        >
          <Download size={14} />
        </button>
        
        <button 
          className="flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
