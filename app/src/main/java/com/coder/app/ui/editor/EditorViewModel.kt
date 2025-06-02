package com.coder.app.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.coder.app.data.models.CodeFile
import com.coder.app.data.models.Project
import com.coder.app.data.repository.ProjectRepository
import com.coder.app.utils.FileManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class EditorViewModel(
    private val projectRepository: ProjectRepository,
    private val fileManager: FileManager
) : ViewModel() {
    
    private val _currentProject = MutableStateFlow<Project?>(null)
    val currentProject: StateFlow<Project?> = _currentProject.asStateFlow()
    
    private val _currentFile = MutableStateFlow<CodeFile?>(null)
    val currentFile: StateFlow<CodeFile?> = _currentFile.asStateFlow()
    
    private val _projectFiles = MutableStateFlow<List<CodeFile>>(emptyList())
    val projectFiles: StateFlow<List<CodeFile>> = _projectFiles.asStateFlow()
    
    private val _executionOutput = MutableStateFlow("")
    val executionOutput: StateFlow<String> = _executionOutput.asStateFlow()
    
    private val _isExecuting = MutableStateFlow(false)
    val isExecuting: StateFlow<Boolean> = _isExecuting.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val modifiedFiles = mutableMapOf<String, String>()
    private val expandedFolders = mutableSetOf<String>()
    
    fun loadProject(projectId: String) {
        viewModelScope.launch {
            try {
                val project = projectRepository.getProjectById(projectId)
                _currentProject.value = project
            } catch (e: Exception) {
                _error.value = "Failed to load project: ${e.message}"
            }
        }
    }
    
    fun loadProjectFiles(projectId: String) {
        viewModelScope.launch {
            try {
                // This would typically come from the database
                // For now, we'll create a simple implementation
                val files = getFilesForProject(projectId)
                _projectFiles.value = files
            } catch (e: Exception) {
                _error.value = "Failed to load project files: ${e.message}"
            }
        }
    }
    
    fun loadFile(fileId: String) {
        viewModelScope.launch {
            try {
                // First check if file is modified in memory
                val modifiedContent = modifiedFiles[fileId]
                if (modifiedContent != null) {
                    // Use modified content
                    val file = findFileById(fileId)
                    if (file != null) {
                        _currentFile.value = file.copy(content = modifiedContent)
                    }
                } else {
                    // Load from storage
                    val file = findFileById(fileId)
                    if (file != null) {
                        val content = fileManager.readFile(file.path).getOrElse { "" }
                        _currentFile.value = file.copy(content = content)
                    }
                }
            } catch (e: Exception) {
                _error.value = "Failed to load file: ${e.message}"
            }
        }
    }
    
    fun saveFile(fileId: String, content: String) {
        viewModelScope.launch {
            try {
                val file = findFileById(fileId)
                if (file != null) {
                    fileManager.writeFile(file.copy(content = content)).fold(
                        onSuccess = {
                            modifiedFiles.remove(fileId)
                            _currentFile.value = file.copy(content = content)
                        },
                        onFailure = { exception ->
                            _error.value = "Failed to save file: ${exception.message}"
                        }
                    )
                }
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            }
        }
    }
    
    fun markFileAsModified(fileId: String, content: String) {
        modifiedFiles[fileId] = content
    }
    
    fun executeCode(file: CodeFile, content: String) {
        viewModelScope.launch {
            _isExecuting.value = true
            _executionOutput.value = "Executing ${file.name}...\n"
            
            try {
                // Save file first if modified
                if (modifiedFiles.containsKey(file.id)) {
                    saveFile(file.id, content)
                }
                
                // Execute based on language
                val result = when (file.language) {
                    com.coder.app.data.models.CodeLanguage.PYTHON -> {
                        executePython(file.path)
                    }
                    com.coder.app.data.models.CodeLanguage.JAVASCRIPT -> {
                        executeJavaScript(file.path)
                    }
                    com.coder.app.data.models.CodeLanguage.JAVA -> {
                        executeJava(file.path)
                    }
                    else -> {
                        "Execution not supported for ${file.language.displayName}"
                    }
                }
                
                _executionOutput.value += result
            } catch (e: Exception) {
                _executionOutput.value += "Error: ${e.message}"
                _error.value = "Execution failed: ${e.message}"
            } finally {
                _isExecuting.value = false
            }
        }
    }
    
    fun formatCode(file: CodeFile, content: String) {
        viewModelScope.launch {
            try {
                // Basic formatting - in a real implementation you'd use language-specific formatters
                val formatted = content.lines().joinToString("\n") { line ->
                    line.trim()
                }
                
                _currentFile.value = file.copy(content = formatted)
                markFileAsModified(file.id, formatted)
            } catch (e: Exception) {
                _error.value = "Failed to format code: ${e.message}"
            }
        }
    }
    
    fun toggleFolderExpansion(folderId: String) {
        if (expandedFolders.contains(folderId)) {
            expandedFolders.remove(folderId)
        } else {
            expandedFolders.add(folderId)
        }
        
        // Refresh file list to show/hide folder contents
        _currentProject.value?.let { project ->
            loadProjectFiles(project.id)
        }
    }
    
    private fun findFileById(fileId: String): CodeFile? {
        return _projectFiles.value.find { it.id == fileId }
    }
    
    private fun getFilesForProject(projectId: String): List<CodeFile> {
        // This is a simplified implementation
        // In a real app, this would query the database
        return emptyList()
    }
    
    private suspend fun executePython(filePath: String): String {
        return try {
            val process = ProcessBuilder("python3", filePath)
                .redirectErrorStream(true)
                .start()
            
            val output = process.inputStream.bufferedReader().readText()
            val exitCode = process.waitFor()
            
            if (exitCode == 0) {
                "Output:\n$output"
            } else {
                "Error (exit code $exitCode):\n$output"
            }
        } catch (e: Exception) {
            "Failed to execute Python: ${e.message}"
        }
    }
    
    private suspend fun executeJavaScript(filePath: String): String {
        return try {
            val process = ProcessBuilder("node", filePath)
                .redirectErrorStream(true)
                .start()
            
            val output = process.inputStream.bufferedReader().readText()
            val exitCode = process.waitFor()
            
            if (exitCode == 0) {
                "Output:\n$output"
            } else {
                "Error (exit code $exitCode):\n$output"
            }
        } catch (e: Exception) {
            "Failed to execute JavaScript: ${e.message}"
        }
    }
    
    private suspend fun executeJava(filePath: String): String {
        return try {
            // Compile first
            val compileProcess = ProcessBuilder("javac", filePath)
                .redirectErrorStream(true)
                .start()
            
            val compileOutput = compileProcess.inputStream.bufferedReader().readText()
            val compileExitCode = compileProcess.waitFor()
            
            if (compileExitCode != 0) {
                return "Compilation failed:\n$compileOutput"
            }
            
            // Run
            val className = java.io.File(filePath).nameWithoutExtension
            val runProcess = ProcessBuilder("java", className)
                .directory(java.io.File(filePath).parentFile)
                .redirectErrorStream(true)
                .start()
            
            val runOutput = runProcess.inputStream.bufferedReader().readText()
            val runExitCode = runProcess.waitFor()
            
            if (runExitCode == 0) {
                "Output:\n$runOutput"
            } else {
                "Runtime error (exit code $runExitCode):\n$runOutput"
            }
        } catch (e: Exception) {
            "Failed to execute Java: ${e.message}"
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}

class EditorViewModelFactory(
    private val projectRepository: ProjectRepository,
    private val fileManager: FileManager
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(EditorViewModel::class.java)) {
            return EditorViewModel(projectRepository, fileManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
