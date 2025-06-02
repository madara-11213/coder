package com.coder.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.coder.app.data.models.*
import com.coder.app.data.repository.AIRepository
import com.coder.app.data.repository.ProjectRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AIChatViewModel(
    private val aiRepository: AIRepository,
    private val projectRepository: ProjectRepository
) : ViewModel() {
    
    private val _messages = MutableStateFlow<List<AIMessage>>(emptyList())
    val messages: StateFlow<List<AIMessage>> = _messages.asStateFlow()
    
    private val _availableModels = MutableStateFlow<List<AIModel>>(emptyList())
    val availableModels: StateFlow<List<AIModel>> = _availableModels.asStateFlow()
    
    private val _selectedModel = MutableStateFlow<AIModel?>(null)
    val selectedModel: StateFlow<AIModel?> = _selectedModel.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private var currentProjectId: String? = null
    private var includeCodeContext = true
    private var currentCodeContext: String? = null
    
    fun loadAvailableModels() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                aiRepository.getAvailableModels().fold(
                    onSuccess = { models ->
                        _availableModels.value = models
                        // Select first model by default
                        if (models.isNotEmpty() && _selectedModel.value == null) {
                            _selectedModel.value = models[0]
                        }
                    },
                    onFailure = { exception ->
                        _error.value = "Failed to load AI models: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun selectModel(modelId: String) {
        val model = _availableModels.value.find { it.id == modelId }
        if (model != null) {
            _selectedModel.value = model
        }
    }
    
    fun setProjectContext(projectId: String) {
        currentProjectId = projectId
        loadProjectContext()
    }
    
    fun setIncludeCodeContext(include: Boolean) {
        includeCodeContext = include
    }
    
    fun sendMessage(messageText: String) {
        val selectedModel = _selectedModel.value
        if (selectedModel == null) {
            _error.value = "Please select an AI model first"
            return
        }
        
        viewModelScope.launch {
            // Add user message
            val userMessage = AIMessage(
                role = MessageRole.USER,
                content = messageText
            )
            
            _messages.value = _messages.value + userMessage
            _isLoading.value = true
            _error.value = null
            
            try {
                // Prepare context
                val codeContext = if (includeCodeContext) currentCodeContext else null
                
                // Send to AI
                aiRepository.sendMessage(
                    messages = _messages.value,
                    model = selectedModel.id,
                    includeCodeContext = includeCodeContext,
                    codeContext = codeContext
                ).fold(
                    onSuccess = { aiMessage ->
                        _messages.value = _messages.value + aiMessage
                    },
                    onFailure = { exception ->
                        _error.value = "AI request failed: ${exception.message}"
                        
                        // Add error message to chat
                        val errorMessage = AIMessage(
                            role = MessageRole.ASSISTANT,
                            content = "I'm sorry, I encountered an error: ${exception.message}"
                        )
                        _messages.value = _messages.value + errorMessage
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun clearChat() {
        _messages.value = emptyList()
    }
    
    fun generateCode(prompt: String, language: String) {
        val selectedModel = _selectedModel.value
        if (selectedModel == null) {
            _error.value = "Please select an AI model first"
            return
        }
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                aiRepository.generateCode(
                    prompt = prompt,
                    language = language,
                    model = selectedModel.id,
                    codeContext = if (includeCodeContext) currentCodeContext else null
                ).fold(
                    onSuccess = { code ->
                        val codeMessage = AIMessage(
                            role = MessageRole.ASSISTANT,
                            content = "Here's the generated $language code:\n\n```$language\n$code\n```"
                        )
                        _messages.value = _messages.value + codeMessage
                    },
                    onFailure = { exception ->
                        _error.value = "Code generation failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun explainCode(code: String, language: String) {
        val selectedModel = _selectedModel.value
        if (selectedModel == null) {
            _error.value = "Please select an AI model first"
            return
        }
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                aiRepository.explainCode(
                    code = code,
                    language = language,
                    model = selectedModel.id
                ).fold(
                    onSuccess = { explanation ->
                        val explanationMessage = AIMessage(
                            role = MessageRole.ASSISTANT,
                            content = explanation
                        )
                        _messages.value = _messages.value + explanationMessage
                    },
                    onFailure = { exception ->
                        _error.value = "Code explanation failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun fixCode(code: String, error: String, language: String) {
        val selectedModel = _selectedModel.value
        if (selectedModel == null) {
            _error.value = "Please select an AI model first"
            return
        }
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                aiRepository.fixCode(
                    code = code,
                    error = error,
                    language = language,
                    model = selectedModel.id
                ).fold(
                    onSuccess = { fixedCode ->
                        val fixMessage = AIMessage(
                            role = MessageRole.ASSISTANT,
                            content = "Here's the fixed code:\n\n```$language\n$fixedCode\n```"
                        )
                        _messages.value = _messages.value + fixMessage
                    },
                    onFailure = { exception ->
                        _error.value = "Code fixing failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private fun loadProjectContext() {
        currentProjectId?.let { projectId ->
            viewModelScope.launch {
                try {
                    val project = projectRepository.getProjectById(projectId)
                    if (project != null) {
                        // Build context from project files
                        currentCodeContext = buildProjectContext(project)
                    }
                } catch (e: Exception) {
                    // Handle error silently for context loading
                }
            }
        }
    }
    
    private suspend fun buildProjectContext(project: Project): String {
        // This would typically scan project files and build a context string
        // For now, return basic project info
        return """
            Project: ${project.name}
            Description: ${project.description ?: "No description"}
            Template: ${project.template.displayName}
            Language: ${project.language ?: "Mixed"}
            Path: ${project.path}
        """.trimIndent()
    }
    
    fun clearError() {
        _error.value = null
    }
}

class AIChatViewModelFactory(
    private val aiRepository: AIRepository,
    private val projectRepository: ProjectRepository
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AIChatViewModel::class.java)) {
            return AIChatViewModel(aiRepository, projectRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
