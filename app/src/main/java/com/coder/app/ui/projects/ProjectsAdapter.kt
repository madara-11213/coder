package com.coder.app.ui.projects

import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.coder.app.data.models.Project
import com.coder.app.databinding.ItemProjectBinding

class ProjectsAdapter(
    private val onProjectClick: (Project) -> Unit,
    private val onProjectLongClick: (Project) -> Unit
) : ListAdapter<Project, ProjectsAdapter.ProjectViewHolder>(ProjectDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProjectViewHolder {
        val binding = ItemProjectBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ProjectViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: ProjectViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class ProjectViewHolder(
        private val binding: ItemProjectBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onProjectClick(getItem(position))
                }
            }
            
            binding.root.setOnLongClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onProjectLongClick(getItem(position))
                    true
                } else false
            }
            
            binding.projectMenu.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onProjectLongClick(getItem(position))
                }
            }
        }
        
        fun bind(project: Project) {
            binding.apply {
                projectName.text = project.name
                projectDescription.text = project.description ?: "No description"
                
                // Set language chip
                projectLanguageChip.text = when (project.template) {
                    com.coder.app.data.models.ProjectTemplate.JAVA -> "Java"
                    com.coder.app.data.models.ProjectTemplate.PYTHON -> "Python"
                    com.coder.app.data.models.ProjectTemplate.JAVASCRIPT -> "JavaScript"
                    com.coder.app.data.models.ProjectTemplate.HTML -> "Web"
                    com.coder.app.data.models.ProjectTemplate.ANDROID -> "Android"
                    com.coder.app.data.models.ProjectTemplate.CPP -> "C++"
                    com.coder.app.data.models.ProjectTemplate.GO -> "Go"
                    com.coder.app.data.models.ProjectTemplate.RUST -> "Rust"
                    com.coder.app.data.models.ProjectTemplate.SWIFT -> "Swift"
                    else -> project.language ?: "Mixed"
                }
                
                // Format last modified time
                val timeAgo = DateUtils.getRelativeTimeSpanString(
                    project.lastModified,
                    System.currentTimeMillis(),
                    DateUtils.MINUTE_IN_MILLIS
                )
                projectModified.text = timeAgo
                
                // Show/hide git status
                if (project.isGitRepository) {
                    gitStatusLayout.visibility = android.view.View.VISIBLE
                    gitBranch.text = project.currentBranch ?: "main"
                    gitStatus.text = "Up to date" // This would come from actual git status
                } else {
                    gitStatusLayout.visibility = android.view.View.GONE
                }
            }
        }
    }
    
    private class ProjectDiffCallback : DiffUtil.ItemCallback<Project>() {
        override fun areItemsTheSame(oldItem: Project, newItem: Project): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Project, newItem: Project): Boolean {
            return oldItem == newItem
        }
    }
}
