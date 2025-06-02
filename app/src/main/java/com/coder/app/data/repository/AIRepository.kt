package com.coder.app.data.repository

import com.coder.app.data.models.AIModel
import com.coder.app.data.models.AIMessage
import com.coder.app.data.models.MessageRole
import com.google.gson.Gson
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import kotlin.random.Random

class AIRepository {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    
    companion object {
        private const val MODELS_URL = "https://text.pollinations.ai/models"
        private const val CHAT_URL = "https://text.pollinations.ai/openai/prompt"
        private const val API_TOKEN = "L0jejdsYQOrz1lFp"
        private const val REFERRER = "L0jejdsYQOrz1lFp"
    }
    
    suspend fun getAvailableModels(): Result<List<AIModel>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(MODELS_URL)
                .addHeader("Referer", REFERRER)
                .addHeader("token", API_TOKEN)
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                val jsonString = response.body?.string() ?: ""
                val jsonArray = JsonParser.parseString(jsonString).asJsonArray
                
                val models = jsonArray.mapNotNull { element ->
                    try {
                        val modelName = element.asString
                        // Exclude openai-audio as requested
                        if (modelName != "openai-audio") {
                            AIModel(
                                id = modelName,
                                name = formatModelName(modelName),
                                description = getModelDescription(modelName),
                                supportsImageAnalysis = modelName.contains("vision") || modelName.contains("gpt-4"),
                                supportsCodeGeneration = true
                            )
                        } else null
                    } catch (e: Exception) {
                        null
                    }
                }
                
                Result.success(models)
            } else {
                Result.failure(Exception("Failed to fetch models: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun sendMessage(
        messages: List<AIMessage>,
        model: String,
        includeCodeContext: Boolean = false,
        codeContext: String? = null
    ): Result<AIMessage> = withContext(Dispatchers.IO) {
        try {
            val systemMessage = buildSystemMessage(includeCodeContext, codeContext)
            val apiMessages = mutableListOf<Map<String, Any>>()
            
            // Add system message if needed
            if (systemMessage.isNotEmpty()) {
                apiMessages.add(
                    mapOf(
                        "role" to "system",
                        "content" to systemMessage
                    )
                )
            }
            
            // Convert messages to API format
            messages.forEach { message ->
                apiMessages.add(
                    mapOf(
                        "role" to when (message.role) {
                            MessageRole.USER -> "user"
                            MessageRole.ASSISTANT -> "assistant"
                            MessageRole.SYSTEM -> "system"
                        },
                        "content" to message.content
                    )
                )
            }
            
            val payload = mapOf(
                "model" to model,
                "messages" to apiMessages,
                "max_tokens" to 128000,
                "token" to API_TOKEN,
                "referrer" to REFERRER,
                "seed" to Random.nextInt(1000000)
            )
            
            val requestBody = gson.toJson(payload)
                .toRequestBody("application/json".toMediaType())
            
            val request = Request.Builder()
                .url(CHAT_URL)
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .addHeader("Referer", REFERRER)
                .addHeader("token", API_TOKEN)
                .build()
            
            val startTime = System.currentTimeMillis()
            val response = client.newCall(request).execute()
            val executionTime = System.currentTimeMillis() - startTime
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: ""
                
                // Parse the response - Pollinations returns the text directly
                val aiMessage = AIMessage(
                    role = MessageRole.ASSISTANT,
                    content = responseBody,
                    model = model,
                    executionTime = executionTime
                )
                
                Result.success(aiMessage)
            } else {
                Result.failure(Exception("API call failed: ${response.code} ${response.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun generateCode(
        prompt: String,
        language: String,
        model: String,
        codeContext: String? = null
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val enhancedPrompt = buildCodeGenerationPrompt(prompt, language, codeContext)
            
            val messages = listOf(
                AIMessage(
                    role = MessageRole.USER,
                    content = enhancedPrompt
                )
            )
            
            val result = sendMessage(messages, model, false)
            
            if (result.isSuccess) {
                Result.success(result.getOrThrow().content)
            } else {
                Result.failure(result.exceptionOrNull() ?: Exception("Code generation failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun fixCode(
        code: String,
        error: String,
        language: String,
        model: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val prompt = """
                Please fix the following $language code that has an error:
                
                **Error:**
                $error
                
                **Code:**
                ```$language
                $code
                ```
                
                Please provide only the corrected code without any explanation, wrapped in ```$language code blocks.
            """.trimIndent()
            
            val messages = listOf(
                AIMessage(
                    role = MessageRole.USER,
                    content = prompt
                )
            )
            
            val result = sendMessage(messages, model, false)
            
            if (result.isSuccess) {
                val response = result.getOrThrow().content
                val extractedCode = extractCodeFromResponse(response, language)
                Result.success(extractedCode)
            } else {
                Result.failure(result.exceptionOrNull() ?: Exception("Code fixing failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun explainCode(
        code: String,
        language: String,
        model: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val prompt = """
                Please explain the following $language code in detail:
                
                ```$language
                $code
                ```
                
                Provide a clear explanation of what this code does, how it works, and any important concepts or patterns used.
            """.trimIndent()
            
            val messages = listOf(
                AIMessage(
                    role = MessageRole.USER,
                    content = prompt
                )
            )
            
            val result = sendMessage(messages, model, false)
            
            if (result.isSuccess) {
                Result.success(result.getOrThrow().content)
            } else {
                Result.failure(result.exceptionOrNull() ?: Exception("Code explanation failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun buildSystemMessage(includeCodeContext: Boolean, codeContext: String?): String {
        return if (includeCodeContext && !codeContext.isNullOrEmpty()) {
            """
                You are an expert coding assistant specialized in helping developers write, debug, and improve code.
                You have access to the current code context:
                
                $codeContext
                
                Please provide helpful, accurate, and practical coding assistance. When generating code, make sure it's properly formatted and follows best practices for the target language.
            """.trimIndent()
        } else {
            """
                You are an expert coding assistant specialized in helping developers write, debug, and improve code.
                Please provide helpful, accurate, and practical coding assistance. When generating code, make sure it's properly formatted and follows best practices for the target language.
            """.trimIndent()
        }
    }
    
    private fun buildCodeGenerationPrompt(prompt: String, language: String, codeContext: String?): String {
        return if (!codeContext.isNullOrEmpty()) {
            """
                Generate $language code for the following request:
                $prompt
                
                Context (existing code):
                $codeContext
                
                Please provide clean, well-commented code that integrates well with the existing context.
            """.trimIndent()
        } else {
            """
                Generate $language code for the following request:
                $prompt
                
                Please provide clean, well-commented, and complete code.
            """.trimIndent()
        }
    }
    
    private fun extractCodeFromResponse(response: String, language: String): String {
        // Try to extract code from markdown code blocks
        val codeBlockRegex = "```(?:$language)?\\s*([\\s\\S]*?)```".toRegex(RegexOption.IGNORE_CASE)
        val match = codeBlockRegex.find(response)
        
        return if (match != null) {
            match.groupValues[1].trim()
        } else {
            // If no code blocks found, return the response as is
            response.trim()
        }
    }
    
    private fun formatModelName(modelId: String): String {
        return modelId.split("-", "_").joinToString(" ") { word ->
            word.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
    }
    
    private fun getModelDescription(modelId: String): String {
        return when {
            modelId.contains("gpt-4") -> "Advanced AI model with superior reasoning and code generation capabilities"
            modelId.contains("gpt-3.5") -> "Fast and efficient AI model for general coding tasks"
            modelId.contains("claude") -> "Anthropic's Claude model with strong analytical capabilities"
            modelId.contains("llama") -> "Meta's open-source language model"
            modelId.contains("gemini") -> "Google's advanced multimodal AI model"
            modelId.contains("mistral") -> "High-performance open-source model"
            modelId.contains("codellama") -> "Specialized model for code generation and analysis"
            else -> "AI language model for coding assistance"
        }
    }
}
