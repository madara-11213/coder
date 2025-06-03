'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore, initializeSampleProjects } from '@/store/projectStore';
import { useBranchStore } from '@/store/branchStore';
import { 
  Folder, 
  File, 
  Plus, 
  FolderPlus, 
  Upload,
  Download,
  Trash2,
  ChevronRight,
  ChevronDown,
  Archive,
  FileText,
  Code,
  Image,
  Music,
  Video,
  X,
  Check
} from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
  content?: string;
  size?: number;
  lastModified?: Date;
  isNew?: boolean;
}

interface ProjectExplorerProps {
  onFileSelect: (filePath: string) => void;
  currentBranch: any;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'extracting' | 'completed' | 'error';
}

export default function ProjectExplorer({ onFileSelect, currentBranch }: ProjectExplorerProps) {
  const { 
    toggleFolder, 
    createNewFile,
    createNewFolder 
  } = useProjectStore();
  
  const { updateBranchFiles } = useBranchStore();
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Initialize with sample projects if none exist
  useEffect(() => {
    // Add proper null/undefined checks
    if (currentBranch && 
        currentBranch.fileTree && 
        Array.isArray(currentBranch.fileTree) && 
        currentBranch.fileTree.length === 0 && 
        currentBranch.isMain) {
      initializeSampleProjects();
    }
  }, [currentBranch?.fileTree?.length, currentBranch?.isMain]);

  const handleFileSelect = (filePath: string) => {
    onFileSelect(filePath);
  };

  // File upload and management functions
  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    const newProgress: UploadProgress[] = [];

    for (const file of Array.from(files)) {
      const progress: UploadProgress = {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      };
      newProgress.push(progress);
      setUploadProgress(prev => [...prev, progress]);

      try {
        if (file.name.endsWith('.zip')) {
          await handleZipExtraction(file, progress);
        } else {
          await handleSingleFileUpload(file, progress);
        }
      } catch (error) {
        progress.status = 'error';
        console.error('Upload error:', error);
      }
    }

    setTimeout(() => {
      setUploadProgress([]);
      setIsUploading(false);
    }, 2000);
  };

  const handleZipExtraction = async (zipFile: File, progress: UploadProgress) => {
    progress.status = 'extracting';
    progress.progress = 50;
    setUploadProgress(prev => [...prev]);

    // Simulate zip extraction (in a real app, you'd use a library like JSZip)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const projectName = zipFile.name.replace('.zip', '');
    const newProject: FileNode = {
      name: projectName,
      type: 'folder',
      path: projectName,
      expanded: true,
      isNew: true,
      children: [
        {
          name: 'index.html',
          type: 'file',
          path: `${projectName}/index.html`,
          content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Uploaded Project</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>',
          isNew: true
        },
        {
          name: 'style.css',
          type: 'file',
          path: `${projectName}/style.css`,
          content: 'body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}',
          isNew: true
        }
      ]
    };

    if (currentBranch && currentBranch.fileTree && Array.isArray(currentBranch.fileTree)) {
      updateBranchFiles(currentBranch.id, [...currentBranch.fileTree, newProject]);
    }
    progress.status = 'completed';
    progress.progress = 100;
  };

  const handleSingleFileUpload = async (file: File, progress: UploadProgress) => {
    const content = await readFileAsText(file);
    
    const newFile: FileNode = {
      name: file.name,
      type: 'file',
      path: `uploads/${file.name}`,
      content,
      size: file.size,
      lastModified: new Date(file.lastModified),
      isNew: true
    };

    // Add to uploads folder or create it
    if (currentBranch && currentBranch.fileTree && Array.isArray(currentBranch.fileTree)) {
      const uploadsFolder = currentBranch.fileTree.find(node => node.name === 'uploads');
      if (uploadsFolder && uploadsFolder.children && Array.isArray(uploadsFolder.children)) {
        uploadsFolder.children.push(newFile);
        updateBranchFiles(currentBranch.id, [...currentBranch.fileTree]);
      } else {
        const newUploadsFolder: FileNode = {
          name: 'uploads',
          type: 'folder',
          path: 'uploads',
          expanded: true,
          children: [newFile],
          isNew: true
        };
        updateBranchFiles(currentBranch.id, [...currentBranch.fileTree, newUploadsFolder]);
      }
    }

    progress.status = 'completed';
    progress.progress = 100;
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const createNewProject = () => {
    const projectName = prompt('Enter project name:');
    if (!projectName) return;

    const newProject: FileNode = {
      name: projectName,
      type: 'folder',
      path: projectName,
      expanded: true,
      isNew: true,
      children: []
    };

    if (currentBranch && currentBranch.fileTree && Array.isArray(currentBranch.fileTree)) {
      updateBranchFiles(currentBranch.id, [...currentBranch.fileTree, newProject]);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'rs':
      case 'go':
        return <Code size={16} className="text-blue-400" />;
      case 'html':
      case 'css':
      case 'scss':
      case 'less':
        return <Code size={16} className="text-green-400" />;
      case 'md':
      case 'txt':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return <FileText size={16} className="text-yellow-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image size={16} className="text-purple-400" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Music size={16} className="text-pink-400" />;
      case 'mp4':
      case 'mov':
      case 'avi':
        return <Video size={16} className="text-red-400" />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return <Archive size={16} className="text-orange-400" />;
      default:
        return <File size={16} className="text-gray-400" />;
    }
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
            <span className="mr-2">{getFileIcon(node.name)}</span>
          )}
          
          <span className={`text-sm truncate mr-2 ${node.isNew ? 'text-green-400' : ''}`}>
            {node.name}
          </span>
          
          {node.isNew && (
            <span className="text-xs bg-green-600 text-white px-1 rounded">NEW</span>
          )}
        </div>
        
        {node.type === 'folder' && node.expanded && node.children && Array.isArray(node.children) && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to get file tree safely
  const getFileTree = () => {
    if (!currentBranch || !currentBranch.fileTree || !Array.isArray(currentBranch.fileTree)) {
      return [];
    }
    return currentBranch.fileTree;
  };

  const fileTree = getFileTree();

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            onClick={createNewProject}
          >
            <Plus size={14} />
            New Project
          </button>
          
          <button 
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadProgress.map((progress, index) => (
              <div key={index} className="bg-gray-700 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm truncate">{progress.fileName}</span>
                  <span className="text-xs text-gray-400">
                    {progress.status === 'completed' ? (
                      <Check size={12} className="text-green-400" />
                    ) : progress.status === 'error' ? (
                      <X size={12} className="text-red-400" />
                    ) : (
                      `${progress.progress}%`
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      progress.status === 'completed' ? 'bg-green-400' :
                      progress.status === 'error' ? 'bg-red-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1 capitalize">
                  {progress.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".zip,.js,.jsx,.ts,.tsx,.py,.html,.css,.scss,.json,.md,.txt,.java,.cpp,.c,.rs,.go"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File Tree */}
      <div 
        className={`flex-1 overflow-y-auto transition-colors ${
          dragOver ? 'bg-blue-600/20 border-2 border-blue-600 border-dashed' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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