package com.coder.app.ui.editor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.coder.app.CoderApplication
import com.coder.app.databinding.FragmentEditorBinding
import com.coder.app.data.models.CodeFile
import io.github.rosemoe.sora.widget.schemes.EditorColorScheme
import kotlinx.coroutines.launch

class EditorFragment : Fragment() {
    
    private var _binding: FragmentEditorBinding? = null
    private val binding get() = _binding!!
    
    private val args: EditorFragmentArgs by navArgs()
    
    private val viewModel: EditorViewModel by viewModels {
        EditorViewModelFactory(
            CoderApplication.getInstance().projectRepository,
            CoderApplication.getInstance().fileManager
        )
    }
    
    private lateinit var filesAdapter: FilesAdapter
    private var currentFile: CodeFile? = null
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentEditorBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupCodeEditor()
        setupFileExplorer()
        setupClickListeners()
        observeViewModel()
        
        // Load project if provided
        args.projectId?.let { projectId ->
            viewModel.loadProject(projectId)
            args.fileId?.let { fileId ->
                viewModel.loadFile(fileId)
            }
        }
    }
    
    private fun setupCodeEditor() {
        binding.codeEditor.apply {
            // Set color scheme
            colorScheme = EditorColorScheme()
            
            // Enable features
            isLineNumberEnabled = true
            isWordwrap = false
            
            // Set text change listener
            subscribeEvent(
                io.github.rosemoe.sora.event.ContentChangeEvent::class.java
            ) { _, _ ->
                currentFile?.let { file ->
                    viewModel.markFileAsModified(file.id, getText().toString())
                }
            }
        }
    }
    
    private fun setupFileExplorer() {
        filesAdapter = FilesAdapter(
            onFileClick = { file ->
                if (!file.isDirectory) {
                    viewModel.loadFile(file.id)
                }
            },
            onFolderClick = { folder ->
                viewModel.toggleFolderExpansion(folder.id)
            }
        )
        
        binding.filesRecycler.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = filesAdapter
        }
    }
    
    private fun setupClickListeners() {
        binding.btnSave.setOnClickListener {
            currentFile?.let { file ->
                val content = binding.codeEditor.text.toString()
                viewModel.saveFile(file.id, content)
            }
        }
        
        binding.btnRun.setOnClickListener {
            currentFile?.let { file ->
                val content = binding.codeEditor.text.toString()
                viewModel.executeCode(file, content)
            }
        }
        
        binding.fabToggleFiles.setOnClickListener {
            toggleFileExplorer()
        }
        
        binding.btnShowFiles.setOnClickListener {
            toggleFileExplorer()
        }
        
        binding.btnCollapseFiles.setOnClickListener {
            hideFileExplorer()
        }
        
        binding.btnCollapseConsole.setOnClickListener {
            hideConsole()
        }
        
        binding.btnClearConsole.setOnClickListener {
            binding.consoleOutput.text = ""
        }
        
        // Quick action chips
        binding.chipUndo.setOnClickListener {
            binding.codeEditor.undo()
        }
        
        binding.chipRedo.setOnClickListener {
            binding.codeEditor.redo()
        }
        
        binding.chipFind.setOnClickListener {
            // TODO: Implement find/replace dialog
        }
        
        binding.chipFormat.setOnClickListener {
            currentFile?.let { file ->
                val content = binding.codeEditor.text.toString()
                viewModel.formatCode(file, content)
            }
        }
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.currentProject.collect { project ->
                if (project != null) {
                    updateProjectInfo(project)
                    viewModel.loadProjectFiles(project.id)
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.projectFiles.collect { files ->
                filesAdapter.submitList(files)
                updateEmptyEditorState(files.isEmpty())
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.currentFile.collect { file ->
                if (file != null) {
                    loadFileInEditor(file)
                    currentFile = file
                    updateFileInfo(file)
                    showEditor()
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.executionOutput.collect { output ->
                if (output.isNotEmpty()) {
                    binding.consoleOutput.text = output
                    showConsole()
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.isExecuting.collect { isExecuting ->
                binding.btnRun.isEnabled = !isExecuting
                if (isExecuting) {
                    showConsole()
                }
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
    
    private fun loadFileInEditor(file: CodeFile) {
        binding.codeEditor.setText(file.content)
        
        // Set language for syntax highlighting
        val language = when (file.language) {
            com.coder.app.data.models.CodeLanguage.JAVA -> 
                io.github.rosemoe.sora.langs.java.JavaLanguage()
            com.coder.app.data.models.CodeLanguage.PYTHON -> 
                io.github.rosemoe.sora.langs.python.PythonLanguage()
            com.coder.app.data.models.CodeLanguage.JAVASCRIPT -> 
                io.github.rosemoe.sora.langs.javascript.JavaScriptLanguage()
            com.coder.app.data.models.CodeLanguage.HTML -> 
                io.github.rosemoe.sora.langs.html.HTMLLanguage()
            com.coder.app.data.models.CodeLanguage.CSS -> 
                io.github.rosemoe.sora.langs.css.CSSLanguage()
            else -> null
        }
        
        language?.let { binding.codeEditor.setEditorLanguage(it) }
    }
    
    private fun updateProjectInfo(project: com.coder.app.data.models.Project) {
        // Update project-related UI
    }
    
    private fun updateFileInfo(file: CodeFile) {
        binding.currentFilePath.text = file.relativePath
    }
    
    private fun updateEmptyEditorState(isEmpty: Boolean) {
        binding.emptyEditorState.visibility = if (isEmpty && currentFile == null) {
            View.VISIBLE
        } else {
            View.GONE
        }
    }
    
    private fun showEditor() {
        binding.emptyEditorState.visibility = View.GONE
    }
    
    private fun toggleFileExplorer() {
        val isVisible = binding.fileExplorerCard.visibility == View.VISIBLE
        if (isVisible) {
            hideFileExplorer()
        } else {
            showFileExplorer()
        }
    }
    
    private fun showFileExplorer() {
        binding.fileExplorerCard.visibility = View.VISIBLE
        binding.fabToggleFiles.text = "Hide Files"
    }
    
    private fun hideFileExplorer() {
        binding.fileExplorerCard.visibility = View.GONE
        binding.fabToggleFiles.text = "Show Files"
    }
    
    private fun showConsole() {
        binding.bottomPanelCard.visibility = View.VISIBLE
    }
    
    private fun hideConsole() {
        binding.bottomPanelCard.visibility = View.GONE
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
