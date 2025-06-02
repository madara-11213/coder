package com.coder.app.ui.dialogs

import android.content.Context
import androidx.appcompat.app.AlertDialog
import com.coder.app.R
import com.coder.app.data.models.ProjectTemplate
import com.coder.app.databinding.DialogCreateProjectBinding
import com.google.android.material.dialog.MaterialAlertDialogBuilder

data class ProjectData(
    val name: String,
    val description: String?,
    val template: ProjectTemplate
)

object CreateProjectDialog {
    
    fun show(
        context: Context,
        onProjectCreate: (ProjectData) -> Unit
    ) {
        val binding = DialogCreateProjectBinding.inflate(
            android.view.LayoutInflater.from(context)
        )
        
        // Setup template options
        setupTemplateOptions(binding)
        
        val dialog = MaterialAlertDialogBuilder(context)
            .setTitle(R.string.dialog_create_project_title)
            .setView(binding.root)
            .setPositiveButton(R.string.dialog_create) { _, _ ->
                val name = binding.projectNameInput.text?.toString()?.trim()
                val description = binding.projectDescriptionInput.text?.toString()?.trim()
                val selectedTemplate = getSelectedTemplate(binding)
                
                if (!name.isNullOrBlank()) {
                    onProjectCreate(
                        ProjectData(
                            name = name,
                            description = description?.takeIf { it.isNotBlank() },
                            template = selectedTemplate
                        )
                    )
                }
            }
            .setNegativeButton(R.string.dialog_cancel, null)
            .create()
        
        // Enable/disable create button based on input
        binding.projectNameInput.addTextChangedListener(
            object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: android.text.Editable?) {
                    val button = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                    button.isEnabled = !s.isNullOrBlank()
                }
            }
        )
        
        dialog.show()
        
        // Initially disable create button
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = false
    }
    
    private fun setupTemplateOptions(binding: DialogCreateProjectBinding) {
        val templates = listOf(
            "Empty Project" to ProjectTemplate.EMPTY,
            "Java Console App" to ProjectTemplate.JAVA,
            "Python Script" to ProjectTemplate.PYTHON,
            "JavaScript/Node.js" to ProjectTemplate.JAVASCRIPT,
            "HTML/CSS/JS Website" to ProjectTemplate.HTML,
            "Android App" to ProjectTemplate.ANDROID,
            "C++ Console App" to ProjectTemplate.CPP,
            "Go Application" to ProjectTemplate.GO,
            "Rust Application" to ProjectTemplate.RUST,
            "Swift Application" to ProjectTemplate.SWIFT
        )
        
        // Setup template buttons in chip group
        templates.forEach { (displayName, template) ->
            val chip = com.google.android.material.chip.Chip(binding.root.context).apply {
                text = displayName
                isCheckable = true
                tag = template
            }
            binding.templateChipGroup.addView(chip)
        }
        
        // Select first template by default
        (binding.templateChipGroup.getChildAt(0) as? com.google.android.material.chip.Chip)?.isChecked = true
    }
    
    private fun getSelectedTemplate(binding: DialogCreateProjectBinding): ProjectTemplate {
        val checkedChipId = binding.templateChipGroup.checkedChipId
        if (checkedChipId != android.view.View.NO_ID) {
            val checkedChip = binding.templateChipGroup.findViewById<com.google.android.material.chip.Chip>(checkedChipId)
            return checkedChip.tag as? ProjectTemplate ?: ProjectTemplate.EMPTY
        }
        return ProjectTemplate.EMPTY
    }
}
