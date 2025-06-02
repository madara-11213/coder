package com.coder.app.ui.chat

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.coder.app.data.models.AIMessage
import com.coder.app.data.models.MessageRole
import com.coder.app.databinding.ItemChatMessageBinding
import java.util.*

class ChatMessagesAdapter : ListAdapter<AIMessage, ChatMessagesAdapter.MessageViewHolder>(MessageDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val binding = ItemChatMessageBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return MessageViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class MessageViewHolder(
        private val binding: ItemChatMessageBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(message: AIMessage) {
            binding.apply {
                when (message.role) {
                    MessageRole.USER -> {
                        userMessageLayout.visibility = View.VISIBLE
                        aiMessageLayout.visibility = View.GONE
                        loadingLayout.visibility = View.GONE
                        
                        userMessageText.text = message.content
                    }
                    
                    MessageRole.ASSISTANT -> {
                        userMessageLayout.visibility = View.GONE
                        aiMessageLayout.visibility = View.VISIBLE
                        loadingLayout.visibility = View.GONE
                        
                        // Parse message content to separate text and code
                        parseAndDisplayMessage(message)
                        
                        // Set timestamp
                        val time = DateFormat.format("h:mm a", Date(message.timestamp))
                        messageTimestamp.text = time.toString()
                        
                        // Set model info
                        message.model?.let { model ->
                            messageModel.text = model
                            messageModel.visibility = View.VISIBLE
                        } ?: run {
                            messageModel.visibility = View.GONE
                        }
                    }
                    
                    MessageRole.SYSTEM -> {
                        // Handle system messages if needed
                        userMessageLayout.visibility = View.GONE
                        aiMessageLayout.visibility = View.GONE
                        loadingLayout.visibility = View.GONE
                    }
                }
            }
        }
        
        private fun parseAndDisplayMessage(message: AIMessage) {
            val content = message.content
            
            // Check if message contains code blocks
            val codeBlockRegex = "```(\\w+)?\\s*([\\s\\S]*?)```".toRegex()
            val codeMatch = codeBlockRegex.find(content)
            
            if (codeMatch != null) {
                // Split content into text and code parts
                val beforeCode = content.substring(0, codeMatch.range.first).trim()
                val language = codeMatch.groupValues[1].ifBlank { "text" }
                val code = codeMatch.groupValues[2].trim()
                val afterCode = content.substring(codeMatch.range.last + 1).trim()
                
                // Set text content (before and after code)
                val textContent = listOf(beforeCode, afterCode)
                    .filter { it.isNotBlank() }
                    .joinToString("\n\n")
                
                binding.aiMessageText.text = textContent.ifBlank { "Generated code:" }
                
                // Show code block
                binding.codeBlockCard.visibility = View.VISIBLE
                binding.codeLanguage.text = language.uppercase()
                binding.codeContent.text = code
                
                // Setup copy button
                binding.btnCopyCode.setOnClickListener {
                    copyToClipboard(code)
                }
            } else {
                // No code blocks, just display text
                binding.aiMessageText.text = content
                binding.codeBlockCard.visibility = View.GONE
            }
        }
        
        private fun copyToClipboard(text: String) {
            val clipboard = binding.root.context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Code", text)
            clipboard.setPrimaryClip(clip)
            
            // Show feedback
            com.google.android.material.snackbar.Snackbar.make(
                binding.root,
                "Code copied to clipboard",
                com.google.android.material.snackbar.Snackbar.LENGTH_SHORT
            ).show()
        }
    }
    
    private class MessageDiffCallback : DiffUtil.ItemCallback<AIMessage>() {
        override fun areItemsTheSame(oldItem: AIMessage, newItem: AIMessage): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: AIMessage, newItem: AIMessage): Boolean {
            return oldItem == newItem
        }
    }
}
