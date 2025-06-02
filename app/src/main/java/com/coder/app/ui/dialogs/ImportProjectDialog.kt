package com.coder.app.ui.dialogs

import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder

object ImportProjectDialog {
    
    fun show(
        context: Context,
        onProjectImport: (String) -> Unit
    ) {
        val options = arrayOf(
            "Browse for folder",
            "Clone from Git URL",
            "Import from zip file"
        )
        
        MaterialAlertDialogBuilder(context)
            .setTitle("Import Project")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showFolderPicker(context, onProjectImport)
                    1 -> showGitCloneDialog(context, onProjectImport)
                    2 -> showZipImportDialog(context, onProjectImport)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showFolderPicker(context: Context, onProjectImport: (String) -> Unit) {
        // For now, show a simple input dialog for folder path
        // In a real implementation, you'd use the Storage Access Framework
        val input = android.widget.EditText(context).apply {
            hint = "Enter folder path (e.g., /storage/emulated/0/MyProject)"
        }
        
        MaterialAlertDialogBuilder(context)
            .setTitle("Select Project Folder")
            .setView(input)
            .setPositiveButton("Import") { _, _ ->
                val path = input.text.toString().trim()
                if (path.isNotBlank()) {
                    onProjectImport(path)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showGitCloneDialog(context: Context, onProjectImport: (String) -> Unit) {
        val input = android.widget.EditText(context).apply {
            hint = "https://github.com/user/repo.git"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_URI
        }
        
        MaterialAlertDialogBuilder(context)
            .setTitle("Clone Git Repository")
            .setMessage("Enter the Git repository URL to clone:")
            .setView(input)
            .setPositiveButton("Clone") { _, _ ->
                val url = input.text.toString().trim()
                if (url.isNotBlank()) {
                    // For now, we'll just pass the URL as the path
                    // In a real implementation, you'd clone the repo first
                    onProjectImport(url)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showZipImportDialog(context: Context, onProjectImport: (String) -> Unit) {
        val input = android.widget.EditText(context).apply {
            hint = "Enter zip file path"
        }
        
        MaterialAlertDialogBuilder(context)
            .setTitle("Import from Zip")
            .setMessage("Enter the path to the zip file containing your project:")
            .setView(input)
            .setPositiveButton("Import") { _, _ ->
                val path = input.text.toString().trim()
                if (path.isNotBlank()) {
                    onProjectImport(path)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
