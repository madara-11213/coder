package com.coder.app.ui.chat

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.coder.app.CoderApplication
import com.coder.app.databinding.FragmentAiChatBinding
import com.coder.app.data.models.AIMessage
import com.coder.app.data.models.MessageRole
import kotlinx.coroutines.launch

class AIChatFragment : Fragment() {
    
    private var _binding: FragmentAiChatBinding? = null
    private val binding get() = _binding!!
    
    private val args: AIChatFragmentArgs by navArgs()
    
    private val viewModel: AIChatViewModel by viewModels {
        AIChatViewModelFactory(
            CoderApplication.getInstance().aiRepository,
            CoderApplication.getInstance().projectRepository
        )
    }
    
    private lateinit var messagesAdapter: ChatMessagesAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAiChatBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerView()
        setupModelSelector()
        setupInputArea()
        setupClickListeners()
        observeViewModel()
        
        // Load project context if provided
        args.projectId?.let { projectId ->
            viewModel.setProjectContext(projectId)
        }
        
        // Load available AI models
        viewModel.loadAvailableModels()
    }
    
    private fun setupRecyclerView() {
        messagesAdapter = ChatMessagesAdapter()
        
        binding.messagesRecycler.apply {
            layoutManager = LinearLayoutManager(requireContext()).apply {
                stackFromEnd = true
            }
            adapter = messagesAdapter
        }
    }
    
    private fun setupModelSelector() {
        // Model selector will be populated when models are loaded
        binding.modelSelector.setOnItemClickListener { _, _, position, _ ->
            val selectedModel = viewModel.availableModels.value.getOrNull(position)
            selectedModel?.let { model ->
                viewModel.selectModel(model.id)
            }
        }
    }
    
    private fun setupInputArea() {
        binding.messageInput.addTextChangedListener { text ->
            val hasText = !text.isNullOrBlank()
            binding.btnSendMessage.isEnabled = hasText
        }
        
        binding.messageInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_SEND) {
                sendMessage()
                true
            } else false
        }
    }
    
    private fun setupClickListeners() {
        binding.btnSendMessage.setOnClickListener {
            sendMessage()
        }
        
        binding.btnClearChat.setOnClickListener {
            viewModel.clearChat()
        }
        
        binding.switchIncludeContext.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setIncludeCodeContext(isChecked)
        }
        
        // Quick action buttons
        binding.btnGenerateCode.setOnClickListener {
            setQuickPrompt("Generate a simple function that")
        }
        
        binding.btnExplainCode.setOnClickListener {
            setQuickPrompt("Please explain this code:")
        }
        
        binding.btnFixError.setOnClickListener {
            setQuickPrompt("I'm getting an error, can you help fix it?")
        }
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.messages.collect { messages ->
                messagesAdapter.submitList(messages)
                updateEmptyState(messages.isEmpty())
                
                // Scroll to bottom when new message arrives
                if (messages.isNotEmpty()) {
                    binding.messagesRecycler.scrollToPosition(messages.size - 1)
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.availableModels.collect { models ->
                if (models.isNotEmpty()) {
                    setupModelDropdown(models)
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.selectedModel.collect { model ->
                binding.modelSelector.setText(model?.name ?: "Select Model", false)
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.isLoading.collect { isLoading ->
                binding.loadingIndicator.visibility = 
                    if (isLoading) View.VISIBLE else View.GONE
                binding.btnSendMessage.isEnabled = !isLoading && 
                    !binding.messageInput.text.isNullOrBlank()
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.error.collect { error ->
                error?.let {
                    showError(it)
                }
            }
        }
    }
    
    private fun setupModelDropdown(models: List<com.coder.app.data.models.AIModel>) {
        val modelNames = models.map { it.name }
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            modelNames
        )
        binding.modelSelector.setAdapter(adapter)
        
        // Select first model by default if none selected
        if (viewModel.selectedModel.value == null && models.isNotEmpty()) {
            viewModel.selectModel(models[0].id)
        }
    }
    
    private fun sendMessage() {
        val messageText = binding.messageInput.text?.toString()?.trim()
        if (!messageText.isNullOrBlank()) {
            viewModel.sendMessage(messageText)
            binding.messageInput.text?.clear()
        }
    }
    
    private fun setQuickPrompt(prompt: String) {
        binding.messageInput.setText(prompt)
        binding.messageInput.setSelection(prompt.length)
        binding.messageInput.requestFocus()
    }
    
    private fun updateEmptyState(isEmpty: Boolean) {
        binding.emptyChatState.visibility = if (isEmpty) View.VISIBLE else View.GONE
        binding.messagesRecycler.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }
    
    private fun showError(message: String) {
        com.google.android.material.snackbar.Snackbar.make(
            binding.root,
            message,
            com.google.android.material.snackbar.Snackbar.LENGTH_LONG
        ).show()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
