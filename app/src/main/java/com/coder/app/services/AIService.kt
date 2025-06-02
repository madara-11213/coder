package com.coder.app.services

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import com.coder.app.data.models.AIMessage
import com.coder.app.data.models.AIModel
import com.coder.app.data.models.MessageRole
import com.coder.app.data.repository.AIRepository
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AIService : Service() {
    
    private val binder = AIServiceBinder()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val aiRepository = AIRepository()
    
    private val _availableModels = MutableStateFlow<List<AIModel>>(emptyList())
    val availableModels: StateFlow<List<AIModel>> = _availableModels.asStateFlow()
    
    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()
    
    private val activeChats = mutableMapOf<String, MutableList<AIMessage>>()
    
    inner class AIServiceBinder : Binder() {
        fun getService(): AIService = this@AIService
    }
    
    override fun onBind(intent: Intent): IBinder {
        return binder
    }
    
    override fun onCreate() {
        super.onCreate()
        loadAvailableModels()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
    
    private fun loadAvailableModels() {
        serviceScope.launch {
            try {
                aiRepository.getAvailableModels().fold(
                    onSuccess = { models ->
                        _availableModels.value = models
                    },
                    onFailure = { exception ->
                        // Handle error silently in service
                    }
                )
            } catch (e: Exception) {
                // Handle error silently in service
            }
        }
    }
    
    fun sendMessage(
        chatId: String,
        message: String,
        model: String,
        includeCodeContext: Boolean = false,
        codeContext: String? = null,
        onResult: (Result<AIMessage>) -> Unit
    ) {
        serviceScope.launch {
            _isProcessing.value = true
            
            try {
                // Get or create chat history
                val chatHistory = activeChats.getOrPut(chatId) { mutableListOf() }
                
                // Add user message to history
                val userMessage = AIMessage(
                    role = MessageRole.USER,
                    content = message
                )
                chatHistory.add(userMessage)
                
                // Send to AI repository
                aiRepository.sendMessage(
                    messages = chatHistory,
                    model = model,
                    includeCodeContext = includeCodeContext,
                    codeContext = codeContext
                ).fold(
                    onSuccess = { aiMessage ->
                        // Add AI response to history
                        chatHistory.add(aiMessage)
                        
                        // Limit chat history to prevent memory issues
                        if (chatHistory.size > 50) {
                            // Keep system message + last 40 messages
                            val systemMessages = chatHistory.filter { it.role == MessageRole.SYSTEM }
                            val recentMessages = chatHistory.takeLast(40)
                            chatHistory.clear()
                            chatHistory.addAll(systemMessages)
                            chatHistory.addAll(recentMessages.filter { it.role != MessageRole.SYSTEM })
                        }
                        
                        // Return result on main thread
                        withContext(Dispatchers.Main) {
                            onResult(Result.success(aiMessage))
                        }
                    },
                    onFailure = { exception ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.failure(exception))
                        }
                    }
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onResult(Result.failure(e))
                }
            } finally {
                _isProcessing.value = false
            }
        }
    }
    
    fun generateCode(
        prompt: String,
        language: String,
        model: String,
        codeContext: String? = null,
        onResult: (Result<String>) -> Unit
    ) {
        serviceScope.launch {
            _isProcessing.value = true
            
            try {
                aiRepository.generateCode(
                    prompt = prompt,
                    language = language,
                    model = model,
                    codeContext = codeContext
                ).fold(
                    onSuccess = { code ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.success(code))
                        }
                    },
                    onFailure = { exception ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.failure(exception))
                        }
                    }
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onResult(Result.failure(e))
                }
            } finally {
                _isProcessing.value = false
            }
        }
    }
    
    fun explainCode(
        code: String,
        language: String,
        model: String,
        onResult: (Result<String>) -> Unit
    ) {
        serviceScope.launch {
            _isProcessing.value = true
            
            try {
                aiRepository.explainCode(
                    code = code,
                    language = language,
                    model = model
                ).fold(
                    onSuccess = { explanation ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.success(explanation))
                        }
                    },
                    onFailure = { exception ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.failure(exception))
                        }
                    }
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onResult(Result.failure(e))
                }
            } finally {
                _isProcessing.value = false
            }
        }
    }
    
    fun fixCode(
        code: String,
        error: String,
        language: String,
        model: String,
        onResult: (Result<String>) -> Unit
    ) {
        serviceScope.launch {
            _isProcessing.value = true
            
            try {
                aiRepository.fixCode(
                    code = code,
                    error = error,
                    language = language,
                    model = model
                ).fold(
                    onSuccess = { fixedCode ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.success(fixedCode))
                        }
                    },
                    onFailure = { exception ->
                        withContext(Dispatchers.Main) {
                            onResult(Result.failure(exception))
                        }
                    }
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onResult(Result.failure(e))
                }
            } finally {
                _isProcessing.value = false
            }
        }
    }
    
    fun clearChatHistory(chatId: String) {
        activeChats.remove(chatId)
    }
    
    fun getChatHistory(chatId: String): List<AIMessage> {
        return activeChats[chatId]?.toList() ?: emptyList()
    }
    
    fun getAllChatIds(): Set<String> {
        return activeChats.keys.toSet()
    }
    
    fun refreshModels() {
        loadAvailableModels()
    }
}
