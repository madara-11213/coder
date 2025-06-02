package com.coder.app.ui.terminal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.coder.app.utils.FileManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.util.*

data class TerminalSession(
    val id: String = UUID.randomUUID().toString(),
    val workingDirectory: String,
    val output: StringBuilder = StringBuilder(),
    val isCommandRunning: Boolean = false,
    val currentProcess: Process? = null
)

class TerminalViewModel(
    private val fileManager: FileManager
) : ViewModel() {
    
    private val _terminals = MutableStateFlow<List<TerminalSession>>(emptyList())
    val terminals: StateFlow<List<TerminalSession>> = _terminals.asStateFlow()
    
    private val _currentWorkingDirectory = MutableStateFlow("")
    val currentWorkingDirectory: StateFlow<String> = _currentWorkingDirectory.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private var projectContextPath: String? = null
    
    init {
        // Set initial working directory
        val homeDir = System.getProperty("user.home") ?: "/sdcard"
        _currentWorkingDirectory.value = homeDir
    }
    
    fun setProjectContext(projectId: String) {
        // Set working directory to project directory
        projectContextPath = fileManager.getProjectsDirectory().absolutePath + "/$projectId"
        File(projectContextPath!!).takeIf { it.exists() }?.let { projectDir ->
            _currentWorkingDirectory.value = projectDir.absolutePath
        }
    }
    
    fun createNewTerminal() {
        val newSession = TerminalSession(
            workingDirectory = _currentWorkingDirectory.value
        )
        
        // Add welcome message
        newSession.output.append("Welcome to Coder Terminal\n")
        newSession.output.append("Working directory: ${newSession.workingDirectory}\n")
        newSession.output.append("Type 'help' for available commands\n\n")
        
        _terminals.value = _terminals.value + newSession
    }
    
    fun executeCommand(terminalIndex: Int, command: String) {
        val terminals = _terminals.value.toMutableList()
        if (terminalIndex >= terminals.size) return
        
        val session = terminals[terminalIndex]
        
        viewModelScope.launch {
            try {
                // Add command to output
                session.output.append("${session.workingDirectory.substringAfterLast("/")} $ $command\n")
                
                // Handle built-in commands
                when {
                    command == "clear" -> {
                        session.output.clear()
                    }
                    command == "help" -> {
                        session.output.append(getHelpText())
                    }
                    command.startsWith("cd ") -> {
                        val path = command.substring(3).trim()
                        changeDirectory(session, path)
                    }
                    command == "pwd" -> {
                        session.output.append("${session.workingDirectory}\n")
                    }
                    command == "ls" || command == "dir" -> {
                        listFiles(session)
                    }
                    command.startsWith("cat ") -> {
                        val fileName = command.substring(4).trim()
                        displayFileContent(session, fileName)
                    }
                    command.startsWith("mkdir ") -> {
                        val dirName = command.substring(6).trim()
                        createDirectory(session, dirName)
                    }
                    command.startsWith("touch ") -> {
                        val fileName = command.substring(6).trim()
                        createFile(session, fileName)
                    }
                    command.startsWith("rm ") -> {
                        val fileName = command.substring(3).trim()
                        removeFile(session, fileName)
                    }
                    command == "exit" -> {
                        // Remove this terminal
                        terminals.removeAt(terminalIndex)
                        _terminals.value = terminals
                        return@launch
                    }
                    else -> {
                        // Execute as system command
                        executeSystemCommand(session, command)
                    }
                }
                
                session.output.append("\n")
                
                // Update terminals list
                terminals[terminalIndex] = session
                _terminals.value = terminals
                
            } catch (e: Exception) {
                session.output.append("Error: ${e.message}\n\n")
                terminals[terminalIndex] = session
                _terminals.value = terminals
                _error.value = "Command execution failed: ${e.message}"
            }
        }
    }
    
    fun clearTerminal(terminalIndex: Int) {
        val terminals = _terminals.value.toMutableList()
        if (terminalIndex < terminals.size) {
            terminals[terminalIndex].output.clear()
            _terminals.value = terminals
        }
    }
    
    private fun changeDirectory(session: TerminalSession, path: String) {
        val currentDir = File(session.workingDirectory)
        val targetDir = if (path.startsWith("/")) {
            File(path)
        } else {
            File(currentDir, path)
        }
        
        if (targetDir.exists() && targetDir.isDirectory) {
            val newSession = session.copy(workingDirectory = targetDir.absolutePath)
            val terminals = _terminals.value.toMutableList()
            val index = terminals.indexOfFirst { it.id == session.id }
            if (index != -1) {
                terminals[index] = newSession
                _terminals.value = terminals
                _currentWorkingDirectory.value = targetDir.absolutePath
            }
        } else {
            session.output.append("cd: $path: No such file or directory\n")
        }
    }
    
    private fun listFiles(session: TerminalSession) {
        val dir = File(session.workingDirectory)
        val files = dir.listFiles()
        
        if (files != null) {
            files.sortedWith(compareBy({ !it.isDirectory }, { it.name })).forEach { file ->
                val type = if (file.isDirectory) "d" else "-"
                val permissions = if (file.canRead()) "r" else "-" +
                        if (file.canWrite()) "w" else "-" +
                        if (file.canExecute()) "x" else "-"
                val size = if (file.isFile()) file.length().toString() else "-"
                
                session.output.append("$type$permissions $size ${file.name}\n")
            }
        } else {
            session.output.append("Cannot access directory\n")
        }
    }
    
    private fun displayFileContent(session: TerminalSession, fileName: String) {
        val file = File(session.workingDirectory, fileName)
        if (file.exists() && file.isFile()) {
            try {
                val content = file.readText()
                session.output.append(content)
                if (!content.endsWith("\n")) {
                    session.output.append("\n")
                }
            } catch (e: Exception) {
                session.output.append("cat: $fileName: Permission denied\n")
            }
        } else {
            session.output.append("cat: $fileName: No such file or directory\n")
        }
    }
    
    private fun createDirectory(session: TerminalSession, dirName: String) {
        val dir = File(session.workingDirectory, dirName)
        if (dir.mkdir()) {
            session.output.append("Directory '$dirName' created\n")
        } else {
            session.output.append("mkdir: cannot create directory '$dirName': File exists or permission denied\n")
        }
    }
    
    private fun createFile(session: TerminalSession, fileName: String) {
        val file = File(session.workingDirectory, fileName)
        try {
            if (file.createNewFile()) {
                session.output.append("File '$fileName' created\n")
            } else {
                session.output.append("touch: '$fileName' already exists\n")
            }
        } catch (e: Exception) {
            session.output.append("touch: cannot create '$fileName': Permission denied\n")
        }
    }
    
    private fun removeFile(session: TerminalSession, fileName: String) {
        val file = File(session.workingDirectory, fileName)
        if (file.exists()) {
            if (file.delete()) {
                session.output.append("'$fileName' removed\n")
            } else {
                session.output.append("rm: cannot remove '$fileName': Permission denied\n")
            }
        } else {
            session.output.append("rm: '$fileName': No such file or directory\n")
        }
    }
    
    private suspend fun executeSystemCommand(session: TerminalSession, command: String) {
        try {
            val process = ProcessBuilder()
                .command("sh", "-c", command)
                .directory(File(session.workingDirectory))
                .redirectErrorStream(true)
                .start()
            
            val output = process.inputStream.bufferedReader().readText()
            val exitCode = process.waitFor()
            
            if (output.isNotEmpty()) {
                session.output.append(output)
            }
            
            if (exitCode != 0) {
                session.output.append("Command exited with code $exitCode\n")
            }
        } catch (e: Exception) {
            session.output.append("bash: $command: command not found\n")
        }
    }
    
    private fun getHelpText(): String {
        return """
Available commands:
  ls, dir     - List files and directories
  cd <path>   - Change directory
  pwd         - Show current directory
  cat <file>  - Display file content
  mkdir <dir> - Create directory
  touch <file>- Create empty file
  rm <file>   - Remove file
  clear       - Clear terminal
  help        - Show this help
  exit        - Close terminal

You can also run system commands like:
  python <file.py>
  node <file.js>
  javac <file.java>
  git status
  
        """.trimIndent()
    }
    
    fun clearError() {
        _error.value = null
    }
}

class TerminalViewModelFactory(
    private val fileManager: FileManager
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TerminalViewModel::class.java)) {
            return TerminalViewModel(fileManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
