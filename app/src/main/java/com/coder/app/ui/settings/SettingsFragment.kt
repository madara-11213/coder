package com.coder.app.ui.settings

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.coder.app.CoderApplication
import com.coder.app.R
import com.coder.app.databinding.FragmentSettingsBinding
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class SettingsFragment : Fragment() {
    
    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: SettingsViewModel by viewModels {
        SettingsViewModelFactory(
            CoderApplication.getInstance().aiRepository,
            CoderApplication.getInstance().fileManager
        )
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupModelSelector()
        setupThemeSelector()
        setupEditorThemeSelector()
        setupClickListeners()
        observeViewModel()
        
        // Load initial data
        viewModel.loadSettings()
    }
    
    private fun setupModelSelector() {
        binding.defaultAiModel.setOnItemClickListener { _, _, position, _ ->
            val selectedModel = viewModel.availableModels.value.getOrNull(position)
            selectedModel?.let { model ->
                viewModel.setDefaultAIModel(model.id)
            }
        }
    }
    
    private fun setupThemeSelector() {
        binding.themeToggleGroup.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (isChecked) {
                val theme = when (checkedId) {
                    R.id.btn_theme_light -> "light"
                    R.id.btn_theme_dark -> "dark"
                    R.id.btn_theme_system -> "system"
                    else -> "system"
                }
                viewModel.setTheme(theme)
            }
        }
    }
    
    private fun setupEditorThemeSelector() {
        val editorThemes = arrayOf(
            "VS Code Dark",
            "VS Code Light", 
            "GitHub Dark",
            "GitHub Light",
            "Monokai",
            "Solarized Dark",
            "Solarized Light"
        )
        
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            editorThemes
        )
        binding.editorThemeSelector.setAdapter(adapter)
        
        binding.editorThemeSelector.setOnItemClickListener { _, _, position, _ ->
            viewModel.setEditorTheme(editorThemes[position])
        }
    }
    
    private fun setupClickListeners() {
        // Font size slider
        binding.fontSizeSlider.addOnChangeListener { _, value, fromUser ->
            if (fromUser) {
                viewModel.setFontSize(value.toInt())
            }
        }
        
        // Switches
        binding.switchAutoSave.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setAutoSave(isChecked)
        }
        
        binding.switchSyntaxHighlighting.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setSyntaxHighlighting(isChecked)
        }
        
        binding.switchLineNumbers.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setLineNumbers(isChecked)
        }
        
        binding.switchWordWrap.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setWordWrap(isChecked)
        }
        
        binding.switchAutoSaveChat.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setAutoSaveChat(isChecked)
        }
        
        // Backup and restore buttons
        binding.btnBackupProjects.setOnClickListener {
            viewModel.backupProjects()
        }
        
        binding.btnRestoreProjects.setOnClickListener {
            showRestoreProjectsDialog()
        }
        
        binding.btnClearCache.setOnClickListener {
            showClearCacheDialog()
        }
        
        // About section buttons
        binding.btnPrivacyPolicy.setOnClickListener {
            openUrl("https://example.com/privacy")
        }
        
        binding.btnTermsOfService.setOnClickListener {
            openUrl("https://example.com/terms")
        }
        
        binding.btnOpenSourceLicenses.setOnClickListener {
            showOpenSourceLicensesDialog()
        }
    }
    
    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.availableModels.collect { models ->
                if (models.isNotEmpty()) {
                    setupModelDropdown(models)
                }
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.settings.collect { settings ->
                updateUI(settings)
            }
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.message.collect { message ->
                message?.let {
                    showMessage(it)
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
    
    private fun setupModelDropdown(models: List<com.coder.app.data.models.AIModel>) {
        val modelNames = models.map { it.name }
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            modelNames
        )
        binding.defaultAiModel.setAdapter(adapter)
    }
    
    private fun updateUI(settings: AppSettings) {
        // Update model selector
        binding.defaultAiModel.setText(settings.defaultAIModel, false)
        
        // Update theme selector
        val themeButtonId = when (settings.theme) {
            "light" -> R.id.btn_theme_light
            "dark" -> R.id.btn_theme_dark
            else -> R.id.btn_theme_system
        }
        binding.themeToggleGroup.check(themeButtonId)
        
        // Update editor theme
        binding.editorThemeSelector.setText(settings.editorTheme, false)
        
        // Update font size
        binding.fontSizeSlider.value = settings.fontSize.toFloat()
        
        // Update switches
        binding.switchAutoSave.isChecked = settings.autoSave
        binding.switchSyntaxHighlighting.isChecked = settings.syntaxHighlighting
        binding.switchLineNumbers.isChecked = settings.lineNumbers
        binding.switchWordWrap.isChecked = settings.wordWrap
        binding.switchAutoSaveChat.isChecked = settings.autoSaveChat
    }
    
    private fun showRestoreProjectsDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Restore Projects")
            .setMessage("Select a backup file to restore your projects. This will overwrite existing projects with the same names.")
            .setPositiveButton("Select File") { _, _ ->
                // TODO: Implement file picker for backup restoration
                viewModel.restoreProjects("") // Placeholder
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showClearCacheDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Clear Cache")
            .setMessage("This will clear all temporary files and cached data. Your projects will not be affected.")
            .setPositiveButton("Clear") { _, _ ->
                viewModel.clearCache()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showOpenSourceLicensesDialog() {
        val licenses = """
Android Jetpack Libraries - Apache License 2.0
Material Design Components - Apache License 2.0
OkHttp - Apache License 2.0
Gson - Apache License 2.0
Sora Editor - Apache License 2.0
Room Database - Apache License 2.0
Navigation Component - Apache License 2.0
Lifecycle Components - Apache License 2.0
Kotlin Coroutines - Apache License 2.0
Dexter - Apache License 2.0
        """.trimIndent()
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Open Source Licenses")
            .setMessage(licenses)
            .setPositiveButton("Close", null)
            .show()
    }
    
    private fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        } catch (e: Exception) {
            showError("Could not open URL: ${e.message}")
        }
    }
    
    private fun showMessage(message: String) {
        com.google.android.material.snackbar.Snackbar.make(
            binding.root,
            message,
            com.google.android.material.snackbar.Snackbar.LENGTH_SHORT
        ).show()
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
