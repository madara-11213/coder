package com.coder.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class AIModel(
    val id: String,
    val name: String,
    val description: String? = null,
    val provider: String = "Pollinations",
    val isActive: Boolean = true,
    val supportsCodeGeneration: Boolean = true,
    val supportsImageAnalysis: Boolean = false,
    val maxTokens: Int = 128000,
    val contextWindow: Int = 128000
) : Parcelable

@Parcelize
data class AIMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val role: MessageRole,
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val model: String? = null,
    val tokens: Int? = null,
    val executionTime: Long? = null
) : Parcelable

enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

@Parcelize
data class AIChat(
    val id: String = java.util.UUID.randomUUID().toString(),
    val projectId: String? = null,
    val title: String = "New Chat",
    val messages: MutableList<AIMessage> = mutableListOf(),
    val model: String,
    val createdAt: Long = System.currentTimeMillis(),
    val lastModified: Long = System.currentTimeMillis(),
    val includeCodeContext: Boolean = true
) : Parcelable

@Parcelize
data class CodeExecutionResult(
    val id: String = java.util.UUID.randomUUID().toString(),
    val fileId: String,
    val language: CodeLanguage,
    val output: String = "",
    val error: String = "",
    val exitCode: Int = 0,
    val executionTime: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val success: Boolean = false
) : Parcelable
