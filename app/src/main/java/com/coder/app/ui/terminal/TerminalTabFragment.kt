package com.coder.app.ui.terminal

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.coder.app.CoderApplication
import com.coder.app.databinding.TerminalTabContentBinding
import kotlinx.coroutines.launch

class TerminalTabFragment : Fragment() {
    
    private var _binding: TerminalTabContentBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: TerminalViewModel by viewModels(
        ownerProducer = { requireParentFragment() }
    ) {
        TerminalViewModelFactory(
            CoderApplication.getInstance().fileManager
        )
    }
    
    private lateinit var terminalId: String
    
    companion object {
        private const val ARG_TERMINAL_ID = "terminal_id"
        
        fun newInstance(terminalId: String): TerminalTabFragment {
            return TerminalTabFragment().apply {
                arguments = Bundle().apply {
                    putString(ARG_TERMINAL_ID, terminalId)
                }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        terminalId = arguments?.getString(ARG_TERMINAL_ID) ?: ""
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = TerminalTabContentBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        observeViewModel()
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.terminals.collect { terminals ->
                val terminal = terminals.find { it.id == terminalId }
                terminal?.let { updateTerminalOutput(it) }
            }
        }
    }
    
    private fun updateTerminalOutput(terminal: TerminalSession) {
        binding.apply {
            terminalOutput.text = terminal.output.toString()
            
            // Auto-scroll to bottom
            terminalScroll.post {
                terminalScroll.fullScroll(View.FOCUS_DOWN)
            }
            
            // Show/hide running command indicator
            if (terminal.isCommandRunning) {
                runningCommandLayout.visibility = View.VISIBLE
                runningCommandText.text = "Running command..."
                
                btnStopCommand.setOnClickListener {
                    // Stop running command
                    terminal.currentProcess?.destroy()
                }
            } else {
                runningCommandLayout.visibility = View.GONE
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
