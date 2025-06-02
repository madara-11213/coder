package com.coder.app.ui.editor

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.coder.app.R
import com.coder.app.data.models.CodeFile
import com.coder.app.databinding.ItemFileBinding

class FilesAdapter(
    private val onFileClick: (CodeFile) -> Unit,
    private val onFolderClick: (CodeFile) -> Unit
) : ListAdapter<CodeFile, FilesAdapter.FileViewHolder>(FileDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FileViewHolder {
        val binding = ItemFileBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return FileViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: FileViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class FileViewHolder(
        private val binding: ItemFileBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    val file = getItem(position)
                    if (file.isDirectory) {
                        onFolderClick(file)
                    } else {
                        onFileClick(file)
                    }
                }
            }
        }
        
        fun bind(file: CodeFile) {
            binding.apply {
                fileName.text = file.name
                
                // Set appropriate icon
                if (file.isDirectory) {
                    fileIcon.setImageResource(R.drawable.ic_folder_24)
                    expandIndicator.visibility = android.view.View.VISIBLE
                } else {
                    // Set icon based on file type
                    val iconRes = when (file.language) {
                        com.coder.app.data.models.CodeLanguage.JAVA -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.PYTHON -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.JAVASCRIPT -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.HTML -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.CSS -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.JSON -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.XML -> R.drawable.ic_code_24
                        com.coder.app.data.models.CodeLanguage.MARKDOWN -> R.drawable.ic_code_24
                        else -> R.drawable.ic_code_24
                    }
                    fileIcon.setImageResource(iconRes)
                    expandIndicator.visibility = android.view.View.GONE
                }
                
                // Set indentation based on folder depth
                val depth = file.relativePath.count { it == '/' }
                val indentationWidth = depth * 24 // 24dp per level
                indentation.layoutParams.width = indentationWidth
            }
        }
    }
    
    private class FileDiffCallback : DiffUtil.ItemCallback<CodeFile>() {
        override fun areItemsTheSame(oldItem: CodeFile, newItem: CodeFile): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: CodeFile, newItem: CodeFile): Boolean {
            return oldItem == newItem
        }
    }
}
