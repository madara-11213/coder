package com.coder.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.coder.app.data.models.AIModel
import com.coder.app.data.repository.AIRepository
import com.coder.app.utils.FileManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AppSettings(
    val defaultAIModel: String = "GPT-4",
    val theme: String = "system", // light, dark, system
    val editorTheme: String = "VS Code Dark",
    val fontSize: Int = 14,
    val autoSave: Boolean = true,
    val syntaxHighlighting: Boolean = true,
    val lineNumbers: Boolean = true,
    val wordWrap: Boolean = false,
    val autoSaveChat: Boolean = true
)

class SettingsViewModel(
    private val aiRepository: AIRepository,
    private val fileManager: FileManager
) : ViewModel() {
    
    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()
    
    private val _availableModels = MutableStateFlow<List<AIModel>>(emptyList())
    val availableModels: StateFlow<List<AIModel>> = _availableModels.asStateFlow()
    
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val preferencesManager = PreferencesManager()
    
    fun loadSettings() {
        viewModelScope.launch {
            // Load settings from preferences
            _settings.value = preferencesManager.loadSettings()
            
            // Load available AI models
            loadAvailableModels()
        }
    }
    
    private fun loadAvailableModels() {
        viewModelScope.launch {
            try {
                aiRepository.getAvailableModels().fold(
                    onSuccess = { models ->
                        _availableModels.value = models
                    },
                    onFailure = { exception ->
                        _error.value = "Failed to load AI models: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            }
        }
    }
    
    fun setDefaultAIModel(modelId: String) {
        updateSettings { it.copy(defaultAIModel = modelId) }
    }
    
    fun setTheme(theme: String) {
        updateSettings { it.copy(theme = theme) }
        _message.value = "Theme will be applied on next app restart"
    }
    
    fun setEditorTheme(theme: String) {
        updateSettings { it.copy(editorTheme = theme) }
    }
    
    fun setFontSize(size: Int) {
        updateSettings { it.copy(fontSize = size) }
    }
    
    fun setAutoSave(enabled: Boolean) {
        updateSettings { it.copy(autoSave = enabled) }
    }
    
    fun setSyntaxHighlighting(enabled: Boolean) {
        updateSettings { it.copy(syntaxHighlighting = enabled) }
    }
    
    fun setLineNumbers(enabled: Boolean) {
        updateSettings { it.copy(lineNumbers = enabled) }
    }
    
    fun setWordWrap(enabled: Boolean) {
        updateSettings { it.copy(wordWrap = enabled) }
    }
    
    fun setAutoSaveChat(enabled: Boolean) {
        updateSettings { it.copy(autoSaveChat = enabled) }
    }
    
    fun backupProjects() {
        viewModelScope.launch {
            try {
                val backupsDir = fileManager.getBackupsDirectory()
                val projectsDir = fileManager.getProjectsDirectory()
                
                val timestamp = System.currentTimeMillis()
                val backupFile = fileManager.createBackup(
                    projectsDir.absolutePath,
                    "all_projects_$timestamp"
                )
                
                backupFile.fold(
                    onSuccess = { file ->
                        _message.value = "Projects backed up to: ${file.name}"
                    },
                    onFailure = { exception ->
                        _error.value = "Backup failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Backup failed: ${e.message}"
            }
        }
    }
    
    fun restoreProjects(backupFilePath: String) {
        viewModelScope.launch {
            try {
                val projectsDir = fileManager.getProjectsDirectory()
                
                fileManager.restoreBackup(backupFilePath, projectsDir.absolutePath).fold(
                    onSuccess = {
                        _message.value = "Projects restored successfully"
                    },
                    onFailure = { exception ->
                        _error.value = "Restore failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Restore failed: ${e.message}"
            }
        }
    }
    
    fun clearCache() {
        viewModelScope.launch {
            try {
                fileManager.cleanTempDirectory()
                _message.value = "Cache cleared successfully"
            } catch (e: Exception) {
                _error.value = "Failed to clear cache: ${e.message}"
            }
        }
    }
    
    private fun updateSettings(update: (AppSettings) -> AppSettings) {
        val newSettings = update(_settings.value)
        _settings.value = newSettings
        preferencesManager.saveSettings(newSettings)
    }
    
    fun clearMessage() {
        _message.value = null
    }
    
    fun clearError() {
        _error.value = null
    }
}

class SettingsViewModelFactory(
    private val aiRepository: AIRepository,
    private val fileManager: FileManager
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(SettingsViewModel::class.java)) {
            return SettingsViewModel(aiRepository, fileManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

// Simple preferences manager - in a real app you'd use DataStore or SharedPreferences
class PreferencesManager {
    
    fun loadSettings(): AppSettings {
        // For now, return default settings
        // In a real implementation, load from SharedPreferences or DataStore
        return AppSettings()
    }
    
    fun saveSettings(settings: AppSettings) {
        // In a real implementation, save to SharedPreferences or DataStore
    }
}
