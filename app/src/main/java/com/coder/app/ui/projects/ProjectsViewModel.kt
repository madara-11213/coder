package com.coder.app.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.coder.app.data.models.Project
import com.coder.app.data.models.ProjectTemplate
import com.coder.app.data.repository.ProjectRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class ProjectsViewModel(
    private val projectRepository: ProjectRepository
) : ViewModel() {
    
    private val _searchQuery = MutableStateFlow("")
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)
    
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // Combine all projects with search query
    val projects = combine(
        projectRepository.getAllProjects(),
        _searchQuery
    ) { allProjects, query ->
        if (query.isBlank()) {
            allProjects
        } else {
            allProjects.filter { project ->
                project.name.contains(query, ignoreCase = true) ||
                project.description?.contains(query, ignoreCase = true) == true ||
                project.language?.contains(query, ignoreCase = true) == true
            }
        }
    }
    
    private val _recentProjects = MutableStateFlow<List<Project>>(emptyList())
    val recentProjects: StateFlow<List<Project>> = _recentProjects.asStateFlow()
    
    init {
        loadRecentProjects()
    }
    
    fun searchProjects(query: String) {
        _searchQuery.value = query
    }
    
    fun createProject(
        name: String,
        description: String?,
        template: ProjectTemplate
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                val projectsDir = com.coder.app.CoderApplication.getInstance()
                    .fileManager.getProjectsDirectory()
                
                projectRepository.createProject(
                    name = name,
                    description = description,
                    path = projectsDir.absolutePath,
                    template = template
                ).fold(
                    onSuccess = {
                        // Project created successfully
                        loadRecentProjects()
                    },
                    onFailure = { exception ->
                        _error.value = "Failed to create project: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun importProject(projectPath: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                projectRepository.importProject(projectPath).fold(
                    onSuccess = {
                        // Project imported successfully
                        loadRecentProjects()
                    },
                    onFailure = { exception ->
                        _error.value = "Failed to import project: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun deleteProject(project: Project) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                projectRepository.deleteProject(project).fold(
                    onSuccess = {
                        // Project deleted successfully
                        loadRecentProjects()
                    },
                    onFailure = { exception ->
                        _error.value = "Failed to delete project: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private fun loadRecentProjects() {
        viewModelScope.launch {
            try {
                val recent = projectRepository.getRecentProjects(5)
                _recentProjects.value = recent
            } catch (e: Exception) {
                // Handle error silently for recent projects
            }
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}

class ProjectsViewModelFactory(
    private val projectRepository: ProjectRepository
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProjectsViewModel::class.java)) {
            return ProjectsViewModel(projectRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
