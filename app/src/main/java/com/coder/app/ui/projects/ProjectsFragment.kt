package com.coder.app.ui.projects

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.coder.app.CoderApplication
import com.coder.app.R
import com.coder.app.databinding.FragmentProjectsBinding
import com.coder.app.ui.dialogs.CreateProjectDialog
import com.coder.app.ui.dialogs.ImportProjectDialog
import kotlinx.coroutines.launch

class ProjectsFragment : Fragment() {
    
    private var _binding: FragmentProjectsBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: ProjectsViewModel by viewModels {
        ProjectsViewModelFactory(
            CoderApplication.getInstance().projectRepository
        )
    }
    
    private lateinit var projectsAdapter: ProjectsAdapter
    private lateinit var recentProjectsAdapter: RecentProjectsAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProjectsBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerViews()
        setupClickListeners()
        setupSearch()
        observeViewModel()
    }
    
    private fun setupRecyclerViews() {
        // Main projects adapter
        projectsAdapter = ProjectsAdapter(
            onProjectClick = { project ->
                // Navigate to editor with project
                val action = ProjectsFragmentDirections.actionProjectsToEditor(
                    projectId = project.id
                )
                findNavController().navigate(action)
            },
            onProjectLongClick = { project ->
                // Show project options menu
                showProjectOptionsDialog(project)
            }
        )
        
        binding.projectsRecycler.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = projectsAdapter
        }
        
        // Recent projects adapter
        recentProjectsAdapter = RecentProjectsAdapter { project ->
            // Navigate to editor with project
            val action = ProjectsFragmentDirections.actionProjectsToEditor(
                projectId = project.id
            )
            findNavController().navigate(action)
        }
        
        binding.recentProjectsRecycler.apply {
            layoutManager = LinearLayoutManager(
                requireContext(),
                LinearLayoutManager.HORIZONTAL,
                false
            )
            adapter = recentProjectsAdapter
        }
    }
    
    private fun setupClickListeners() {
        binding.btnNewProject.setOnClickListener {
            showCreateProjectDialog()
        }
        
        binding.btnImportProject.setOnClickListener {
            showImportProjectDialog()
        }
        
        binding.btnCreateFirstProject.setOnClickListener {
            showCreateProjectDialog()
        }
    }
    
    private fun setupSearch() {
        binding.searchProjects.addTextChangedListener { text ->
            val query = text?.toString()?.trim() ?: ""
            viewModel.searchProjects(query)
        }
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.projects.collect { projects ->
                projectsAdapter.submitList(projects)
                updateEmptyState(projects.isEmpty())
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.recentProjects.collect { recentProjects ->
                recentProjectsAdapter.submitList(recentProjects)
                binding.recentProjectsSection.visibility = 
                    if (recentProjects.isNotEmpty()) View.VISIBLE else View.GONE
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.isLoading.collect { isLoading ->
                binding.loadingIndicator.visibility = 
                    if (isLoading) View.VISIBLE else View.GONE
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.error.collect { error ->
                error?.let {
                    // Show error message
                    showError(it)
                }
            }
        }
    }
    
    private fun updateEmptyState(isEmpty: Boolean) {
        binding.emptyState.visibility = if (isEmpty) View.VISIBLE else View.GONE
        binding.projectsRecycler.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }
    
    private fun showCreateProjectDialog() {
        CreateProjectDialog.show(requireContext()) { projectData ->
            viewLifecycleOwner.lifecycleScope.launch {
                viewModel.createProject(
                    name = projectData.name,
                    description = projectData.description,
                    template = projectData.template
                )
            }
        }
    }
    
    private fun showImportProjectDialog() {
        ImportProjectDialog.show(requireContext()) { projectPath ->
            viewLifecycleOwner.lifecycleScope.launch {
                viewModel.importProject(projectPath)
            }
        }
    }
    
    private fun showProjectOptionsDialog(project: com.coder.app.data.models.Project) {
        // TODO: Implement project options dialog (rename, delete, duplicate, etc.)
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
