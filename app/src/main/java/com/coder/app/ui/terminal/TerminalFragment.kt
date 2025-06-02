package com.coder.app.ui.terminal

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.navArgs
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.coder.app.CoderApplication
import com.coder.app.databinding.FragmentTerminalBinding
import com.google.android.material.tabs.TabLayoutMediator
import kotlinx.coroutines.launch

class TerminalFragment : Fragment() {
    
    private var _binding: FragmentTerminalBinding? = null
    private val binding get() = _binding!!
    
    private val args: TerminalFragmentArgs by navArgs()
    
    private val viewModel: TerminalViewModel by viewModels {
        TerminalViewModelFactory(
            CoderApplication.getInstance().fileManager
        )
    }
    
    private lateinit var terminalPagerAdapter: TerminalPagerAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTerminalBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupViewPager()
        setupCommandInput()
        setupClickListeners()
        observeViewModel()
        
        // Set project context if provided
        args.projectId?.let { projectId ->
            viewModel.setProjectContext(projectId)
        }
        
        // Create first terminal tab
        viewModel.createNewTerminal()
    }
    
    private fun setupViewPager() {
        terminalPagerAdapter = TerminalPagerAdapter(this)
        binding.terminalPager.adapter = terminalPagerAdapter
        
        // Setup tabs with ViewPager
        TabLayoutMediator(binding.terminalTabs, binding.terminalPager) { tab, position ->
            tab.text = "Terminal ${position + 1}"
        }.attach()
    }
    
    private fun setupCommandInput() {
        binding.commandInput.addTextChangedListener { text ->
            val hasText = !text.isNullOrBlank()
            binding.btnSendCommand.isEnabled = hasText
        }
        
        binding.commandInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_SEND) {
                executeCommand()
                true
            } else false
        }
    }
    
    private fun setupClickListeners() {
        binding.btnSendCommand.setOnClickListener {
            executeCommand()
        }
        
        binding.btnNewTab.setOnClickListener {
            viewModel.createNewTerminal()
        }
        
        binding.btnClearTerminal.setOnClickListener {
            val currentTab = binding.terminalPager.currentItem
            viewModel.clearTerminal(currentTab)
        }
        
        binding.fabShortcuts.setOnClickListener {
            showShortcutsDialog()
        }
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.terminals.collect { terminals ->
                terminalPagerAdapter.updateTerminals(terminals)
                updateTabLayout(terminals)
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.currentWorkingDirectory.collect { cwd ->
                binding.terminalPrompt.text = "${cwd.substringAfterLast("/")} $ "
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
    
    private fun updateTabLayout(terminals: List<TerminalSession>) {
        // Update tab count and labels
        for (i in terminals.indices) {
            val tab = binding.terminalTabs.getTabAt(i)
            tab?.text = "Terminal ${i + 1}"
        }
    }
    
    private fun executeCommand() {
        val command = binding.commandInput.text?.toString()?.trim()
        if (!command.isNullOrBlank()) {
            val currentTab = binding.terminalPager.currentItem
            viewModel.executeCommand(currentTab, command)
            binding.commandInput.text?.clear()
        }
    }
    
    private fun showShortcutsDialog() {
        val shortcuts = arrayOf(
            "ls - List files",
            "cd - Change directory",
            "pwd - Current directory",
            "cat - View file content",
            "mkdir - Create directory",
            "rm - Remove file",
            "cp - Copy file",
            "mv - Move/rename file",
            "clear - Clear terminal",
            "exit - Exit terminal"
        )
        
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Terminal Shortcuts")
            .setItems(shortcuts) { dialog, which ->
                val shortcut = shortcuts[which].substringBefore(" -")
                binding.commandInput.setText(shortcut)
                binding.commandInput.setSelection(shortcut.length)
                dialog.dismiss()
            }
            .setNegativeButton("Close", null)
            .show()
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
    
    private inner class TerminalPagerAdapter(fragment: Fragment) : FragmentStateAdapter(fragment) {
        private var terminals: List<TerminalSession> = emptyList()
        
        fun updateTerminals(newTerminals: List<TerminalSession>) {
            terminals = newTerminals
            notifyDataSetChanged()
        }
        
        override fun getItemCount(): Int = terminals.size
        
        override fun createFragment(position: Int): Fragment {
            return TerminalTabFragment.newInstance(terminals[position].id)
        }
    }
}
