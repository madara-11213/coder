package com.coder.app.ui.projects

import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.coder.app.data.models.Project
import com.coder.app.databinding.ItemProjectRecentBinding

class RecentProjectsAdapter(
    private val onProjectClick: (Project) -> Unit
) : ListAdapter<Project, RecentProjectsAdapter.RecentProjectViewHolder>(ProjectDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecentProjectViewHolder {
        val binding = ItemProjectRecentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return RecentProjectViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: RecentProjectViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class RecentProjectViewHolder(
        private val binding: ItemProjectRecentBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onProjectClick(getItem(position))
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
                    com.coder.app.data.models.ProjectTemplate.JAVASCRIPT -> "JS"
                    com.coder.app.data.models.ProjectTemplate.HTML -> "Web"
                    com.coder.app.data.models.ProjectTemplate.ANDROID -> "Android"
                    com.coder.app.data.models.ProjectTemplate.CPP -> "C++"
                    com.coder.app.data.models.ProjectTemplate.GO -> "Go"
                    com.coder.app.data.models.ProjectTemplate.RUST -> "Rust"
                    com.coder.app.data.models.ProjectTemplate.SWIFT -> "Swift"
                    else -> project.language ?: "Mixed"
                }
                
                // Format last modified time (shorter format for recent items)
                val now = System.currentTimeMillis()
                val diff = now - project.lastModified
                
                projectModified.text = when {
                    diff < DateUtils.HOUR_IN_MILLIS -> {
                        val minutes = (diff / DateUtils.MINUTE_IN_MILLIS).toInt()
                        "${minutes}m ago"
                    }
                    diff < DateUtils.DAY_IN_MILLIS -> {
                        val hours = (diff / DateUtils.HOUR_IN_MILLIS).toInt()
                        "${hours}h ago"
                    }
                    diff < DateUtils.WEEK_IN_MILLIS -> {
                        val days = (diff / DateUtils.DAY_IN_MILLIS).toInt()
                        "${days}d ago"
                    }
                    else -> {
                        val weeks = (diff / DateUtils.WEEK_IN_MILLIS).toInt()
                        "${weeks}w ago"
                    }
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
