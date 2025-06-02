package com.coder.app.services

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import com.coder.app.data.models.CodeExecutionResult
import com.coder.app.data.models.CodeLanguage
import kotlinx.coroutines.*
import java.io.File
import java.util.concurrent.TimeUnit

class CodeExecutionService : Service() {
    
    private val binder = CodeExecutionBinder()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val executionResults = mutableMapOf<String, CodeExecutionResult>()
    private val runningProcesses = mutableMapOf<String, Process>()
    
    inner class CodeExecutionBinder : Binder() {
        fun getService(): CodeExecutionService = this@CodeExecutionService
    }
    
    override fun onBind(intent: Intent): IBinder {
        return binder
    }
    
    override fun onDestroy() {
        super.onDestroy()
        
        // Cancel all running processes
        runningProcesses.values.forEach { it.destroyForcibly() }
        runningProcesses.clear()
        
        serviceScope.cancel()
    }
    
    fun executeCode(
        fileId: String,
        filePath: String,
        content: String,
        language: CodeLanguage,
        onResult: (CodeExecutionResult) -> Unit
    ) {
        serviceScope.launch {
            val result = try {
                when (language) {
                    CodeLanguage.PYTHON -> executePython(fileId, filePath, content)
                    CodeLanguage.JAVASCRIPT -> executeJavaScript(fileId, filePath, content)
                    CodeLanguage.JAVA -> executeJava(fileId, filePath, content)
                    CodeLanguage.CPP -> executeCpp(fileId, filePath, content)
                    CodeLanguage.C -> executeC(fileId, filePath, content)
                    CodeLanguage.GO -> executeGo(fileId, filePath, content)
                    CodeLanguage.RUST -> executeRust(fileId, filePath, content)
                    CodeLanguage.SHELL -> executeShell(fileId, filePath, content)
                    CodeLanguage.BATCH -> executeBatch(fileId, filePath, content)
                    else -> CodeExecutionResult(
                        fileId = fileId,
                        language = language,
                        error = "Execution not supported for ${language.displayName}",
                        success = false
                    )
                }
            } catch (e: Exception) {
                CodeExecutionResult(
                    fileId = fileId,
                    language = language,
                    error = "Execution failed: ${e.message}",
                    success = false
                )
            }
            
            executionResults[fileId] = result
            
            // Call result callback on main thread
            withContext(Dispatchers.Main) {
                onResult(result)
            }
        }
    }
    
    private suspend fun executePython(fileId: String, filePath: String, content: String): CodeExecutionResult {
        // Write content to file
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.PYTHON,
            command = listOf("python3", filePath),
            workingDirectory = File(filePath).parentFile
        )
    }
    
    private suspend fun executeJavaScript(fileId: String, filePath: String, content: String): CodeExecutionResult {
        // Write content to file
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.JAVASCRIPT,
            command = listOf("node", filePath),
            workingDirectory = File(filePath).parentFile
        )
    }
    
    private suspend fun executeJava(fileId: String, filePath: String, content: String): CodeExecutionResult {
        // Write content to file
        File(filePath).writeText(content)
        
        val sourceFile = File(filePath)
        val className = sourceFile.nameWithoutExtension
        val workingDir = sourceFile.parentFile
        
        // Compile first
        val compileResult = executeProcess(
            fileId = fileId,
            language = CodeLanguage.JAVA,
            command = listOf("javac", filePath),
            workingDirectory = workingDir,
            timeout = 30
        )
        
        if (!compileResult.success) {
            return compileResult.copy(error = "Compilation failed:\n${compileResult.error}")
        }
        
        // Run compiled class
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.JAVA,
            command = listOf("java", className),
            workingDirectory = workingDir
        )
    }
    
    private suspend fun executeCpp(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        val sourceFile = File(filePath)
        val executablePath = sourceFile.absolutePath.replace(".cpp", "")
        val workingDir = sourceFile.parentFile
        
        // Compile
        val compileResult = executeProcess(
            fileId = fileId,
            language = CodeLanguage.CPP,
            command = listOf("g++", "-o", executablePath, filePath),
            workingDirectory = workingDir,
            timeout = 30
        )
        
        if (!compileResult.success) {
            return compileResult.copy(error = "Compilation failed:\n${compileResult.error}")
        }
        
        // Execute
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.CPP,
            command = listOf(executablePath),
            workingDirectory = workingDir
        )
    }
    
    private suspend fun executeC(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        val sourceFile = File(filePath)
        val executablePath = sourceFile.absolutePath.replace(".c", "")
        val workingDir = sourceFile.parentFile
        
        // Compile
        val compileResult = executeProcess(
            fileId = fileId,
            language = CodeLanguage.C,
            command = listOf("gcc", "-o", executablePath, filePath),
            workingDirectory = workingDir,
            timeout = 30
        )
        
        if (!compileResult.success) {
            return compileResult.copy(error = "Compilation failed:\n${compileResult.error}")
        }
        
        // Execute
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.C,
            command = listOf(executablePath),
            workingDirectory = workingDir
        )
    }
    
    private suspend fun executeGo(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.GO,
            command = listOf("go", "run", filePath),
            workingDirectory = File(filePath).parentFile
        )
    }
    
    private suspend fun executeRust(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.RUST,
            command = listOf("rustc", "--edition", "2021", "-o", 
                filePath.replace(".rs", ""), filePath),
            workingDirectory = File(filePath).parentFile
        ).let { compileResult ->
            if (compileResult.success) {
                executeProcess(
                    fileId = fileId,
                    language = CodeLanguage.RUST,
                    command = listOf(filePath.replace(".rs", "")),
                    workingDirectory = File(filePath).parentFile
                )
            } else {
                compileResult
            }
        }
    }
    
    private suspend fun executeShell(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.SHELL,
            command = listOf("bash", filePath),
            workingDirectory = File(filePath).parentFile
        )
    }
    
    private suspend fun executeBatch(fileId: String, filePath: String, content: String): CodeExecutionResult {
        File(filePath).writeText(content)
        
        return executeProcess(
            fileId = fileId,
            language = CodeLanguage.BATCH,
            command = listOf("cmd", "/c", filePath),
            workingDirectory = File(filePath).parentFile
        )
    }
    
    private suspend fun executeProcess(
        fileId: String,
        language: CodeLanguage,
        command: List<String>,
        workingDirectory: File,
        timeout: Long = 60 // seconds
    ): CodeExecutionResult = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        
        try {
            val processBuilder = ProcessBuilder(command)
                .directory(workingDirectory)
                .redirectErrorStream(true)
            
            val process = processBuilder.start()
            runningProcesses[fileId] = process
            
            val completed = process.waitFor(timeout, TimeUnit.SECONDS)
            val executionTime = System.currentTimeMillis() - startTime
            
            if (!completed) {
                process.destroyForcibly()
                runningProcesses.remove(fileId)
                return@withContext CodeExecutionResult(
                    fileId = fileId,
                    language = language,
                    error = "Execution timed out after $timeout seconds",
                    executionTime = executionTime,
                    success = false
                )
            }
            
            val output = process.inputStream.bufferedReader().readText()
            val exitCode = process.exitValue()
            
            runningProcesses.remove(fileId)
            
            CodeExecutionResult(
                fileId = fileId,
                language = language,
                output = output,
                exitCode = exitCode,
                executionTime = executionTime,
                success = exitCode == 0
            )
            
        } catch (e: Exception) {
            runningProcesses.remove(fileId)
            CodeExecutionResult(
                fileId = fileId,
                language = language,
                error = "Execution error: ${e.message}",
                executionTime = System.currentTimeMillis() - startTime,
                success = false
            )
        }
    }
    
    fun stopExecution(fileId: String) {
        runningProcesses[fileId]?.let { process ->
            process.destroyForcibly()
            runningProcesses.remove(fileId)
        }
    }
    
    fun getExecutionResult(fileId: String): CodeExecutionResult? {
        return executionResults[fileId]
    }
    
    fun isExecuting(fileId: String): Boolean {
        return runningProcesses.containsKey(fileId)
    }
}
