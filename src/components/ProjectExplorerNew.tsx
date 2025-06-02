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
  Check,
  Search,
  Filter,
  Grid,
  List
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
    projects,
    selectedProject,
    setSelectedProject,
    createProject,
    deleteProject,
    uploadProjectZip
  } = useProjectStore();
  
  const { updateBranchFiles } = useBranchStore();
  
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');
  const [isCreateFileMode, setIsCreateFileMode] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileParent, setNewFileParent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with sample projects if none exist
  useEffect(() => {
    if (projects.length === 0) {
      initializeSampleProjects();
    }
  }, [projects.length]);

  // Update file tree when current branch changes
  useEffect(() => {
    if (currentBranch?.fileTree) {
      setFileTree(currentBranch.fileTree);
    } else if (selectedProject) {
      setFileTree(selectedProject.files);
    } else {
      setFileTree([]);
    }
  }, [currentBranch?.fileTree, selectedProject]);

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
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code className="text-blue-400" size={16} />;
      case 'html':
      case 'css':
      case 'scss':
      case 'json':
      case 'xml':
      case 'yml':
      case 'yaml':
        return <FileText className="text-green-400" size={16} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="text-purple-400" size={16} />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Music className="text-pink-400" size={16} />;
      case 'mp4':
      case 'avi':
      case 'mkv':
        return <Video className="text-red-400" size={16} />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return <Archive className="text-orange-400" size={16} />;
      default:
        return <File className="text-gray-400" size={16} />;
    }
  };

  const toggleFolder = (path: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.type === 'folder') {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };
    
    setFileTree(updateTree(fileTree));
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName, newProjectDescription);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateModal(false);
    }
  };

  const handleUploadZip = async (file: File) => {
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    });

    try {
      const project = await uploadProjectZip(file, (progress) => {
        setUploadProgress(prev => prev ? { ...prev, progress } : null);
      });

      setUploadProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
      
      setTimeout(() => {
        setUploadProgress(null);
        setShowUploadModal(false);
      }, 1500);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/zip') {
      handleUploadZip(file);
    }
  };

  const createNewFile = (parentPath: string = '') => {
    setNewFileParent(parentPath);
    setIsCreateFileMode(true);
    setNewFileName('');
  };

  const saveNewFile = () => {
    if (!newFileName.trim()) return;
    
    const fullPath = newFileParent ? `${newFileParent}/${newFileName}` : newFileName;
    const isFolder = !newFileName.includes('.');
    
    const newNode: FileNode = {
      name: newFileName,
      type: isFolder ? 'folder' : 'file',
      path: fullPath,
      content: isFolder ? undefined : '',
      children: isFolder ? [] : undefined,
      isNew: true,
      lastModified: new Date()
    };
    
    // Add to file tree
    const addToTree = (nodes: FileNode[], parentPath: string): FileNode[] => {
      if (parentPath === '') {
        return [...nodes, newNode];
      }
      
      return nodes.map(node => {
        if (node.path === parentPath && node.type === 'folder') {
          return {
            ...node,
            children: [...(node.children || []), newNode],
            expanded: true
          };
        }
        if (node.children) {
          return { ...node, children: addToTree(node.children, parentPath) };
        }
        return node;
      });
    };
    
    const updatedTree = addToTree(fileTree, newFileParent);
    setFileTree(updatedTree);
    
    // Update branch if we have one
    if (currentBranch) {
      updateBranchFiles(currentBranch.id, updatedTree);
    }
    
    setIsCreateFileMode(false);
    setNewFileName('');
    setNewFileParent('');
  };

  const deleteNode = (pathToDelete: string) => {
    const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.path === pathToDelete) {
          return false;
        }
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        return true;
      });
    };
    
    if (confirm('Are you sure you want to delete this item?')) {
      const updatedTree = deleteFromTree(fileTree);
      setFileTree(updatedTree);
      
      if (currentBranch) {
        updateBranchFiles(currentBranch.id, updatedTree);
      }
    }
  };

  const filterFiles = (nodes: FileNode[]): FileNode[] => {
    return nodes.filter(node => {
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || 
        (filterType === 'files' && node.type === 'file') ||
        (filterType === 'folders' && node.type === 'folder');
      
      return matchesSearch && matchesType;
    }).map(node => ({
      ...node,
      children: node.children ? filterFiles(node.children) : undefined
    }));
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    const filteredNodes = filterFiles(nodes);
    
    if (viewMode === 'grid' && level === 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
          {filteredNodes.map((node) => (
            <div
              key={node.path}
              onClick={() => node.type === 'file' ? onFileSelect(node.path) : toggleFolder(node.path)}
              className="flex flex-col items-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group"
            >
              <div className="mb-2">
                {node.type === 'folder' ? (
                  <Folder className="text-yellow-400" size={24} />
                ) : (
                  getFileIcon(node.name)
                )}
              </div>
              <span className="text-xs text-center truncate w-full">{node.name}</span>
              {node.isNew && (
                <div className="w-2 h-2 bg-green-400 rounded-full mt-1"></div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {filteredNodes.map((node) => (
          <div key={node.path}>
            <div
              className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded cursor-pointer group transition-colors ${
                level === 0 ? '' : 'ml-4'
              }`}
              onClick={() => node.type === 'file' ? onFileSelect(node.path) : toggleFolder(node.path)}
            >
              <div className="flex-shrink-0 w-4">
                {node.type === 'folder' && (
                  node.expanded ? 
                    <ChevronDown size={14} className="text-gray-400" /> : 
                    <ChevronRight size={14} className="text-gray-400" />
                )}
              </div>
              
              <div className="flex-shrink-0">
                {node.type === 'folder' ? (
                  <Folder className="text-yellow-400" size={16} />
                ) : (
                  getFileIcon(node.name)
                )}
              </div>
              
              <span className="text-sm truncate flex-1 min-w-0">{node.name}</span>
              
              {node.isNew && (
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
              )}
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {node.type === 'folder' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewFile(node.path);
                    }}
                    className="p-1 hover:bg-gray-600 rounded"
                    title="Create file/folder"
                  >
                    <Plus size={12} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.path);
                  }}
                  className="p-1 hover:bg-gray-600 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            
            {node.type === 'folder' && node.expanded && node.children && (
              <div className="ml-2">
                {renderFileTree(node.children, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FolderPlus className="text-yellow-400 flex-shrink-0" size={20} />
            <h2 className="text-base sm:text-lg font-semibold truncate">Project Files</h2>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-1.5 hover:bg-gray-700 rounded"
              title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
            >
              {viewMode === 'list' ? <Grid size={16} /> : <List size={16} />}
            </button>
            
            <button
              onClick={() => createNewFile()}
              className="p-1.5 hover:bg-gray-700 rounded"
              title="Create new file/folder"
            >
              <Plus size={16} />
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 hover:bg-gray-700 rounded"
              title="Create new project"
            >
              <FolderPlus size={16} />
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-1.5 hover:bg-gray-700 rounded"
              title="Upload ZIP file"
            >
              <Upload size={16} />
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="files">Files</option>
              <option value="folders">Folders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branch Info */}
      {currentBranch && (
        <div className="bg-blue-600/20 border-b border-blue-600/30 px-3 sm:px-4 py-2 text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">📂 Branch:</span>
            <span className="font-medium truncate">{currentBranch.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">{fileTree.length} items</span>
          </div>
        </div>
      )}

      {/* Project Selector - Mobile */}
      <div className="sm:hidden bg-gray-800 border-b border-gray-700 px-3 py-2 flex-shrink-0">
        <select
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === e.target.value);
            if (project) setSelectedProject(project);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Select Project</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {isCreateFileMode && (
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.ext or foldername"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') saveNewFile();
                  if (e.key === 'Escape') setIsCreateFileMode(false);
                }}
              />
              <button
                onClick={saveNewFile}
                className="p-1 bg-green-600 hover:bg-green-700 rounded"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setIsCreateFileMode(false)}
                className="p-1 bg-red-600 hover:bg-red-700 rounded"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
            {newFileParent && (
              <div className="text-xs text-gray-400 mt-1">
                Creating in: {newFileParent}
              </div>
            )}
          </div>
        )}
        
        {fileTree.length > 0 ? (
          <div className="p-2">
            {renderFileTree(fileTree)}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
            <div className="text-center">
              <FolderPlus size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No files yet</h3>
              <p className="text-sm mb-4">Create a new project or upload files to get started</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  Upload ZIP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  placeholder="My Awesome Project"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  placeholder="A brief description of your project"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Project</h3>
            
            {uploadProgress ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Archive className="text-blue-400" size={20} />
                  <span className="text-sm text-gray-300">{uploadProgress.fileName}</span>
                </div>
                
                <div className="bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadProgress.status === 'error' ? 'bg-red-500' :
                      uploadProgress.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                
                <div className="text-sm text-gray-400 capitalize">
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'extracting' && 'Extracting files...'}
                  {uploadProgress.status === 'completed' && '✅ Upload completed!'}
                  {uploadProgress.status === 'error' && '❌ Upload failed'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-300 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">ZIP files only</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadProgress(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                {uploadProgress?.status === 'completed' ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
