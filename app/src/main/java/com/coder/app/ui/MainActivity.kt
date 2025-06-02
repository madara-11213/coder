package com.coder.app.ui

import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.findNavController
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.coder.app.CoderApplication
import com.coder.app.R
import com.coder.app.databinding.ActivityMainBinding
import com.coder.app.utils.PermissionManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var permissionManager: PermissionManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        permissionManager = CoderApplication.getInstance().permissionManager
        
        setupUI()
        setupNavigation()
        checkPermissions()
    }
    
    private fun setupUI() {
        setSupportActionBar(binding.toolbar)
        
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0)
            insets
        }
        
        // Setup FAB
        binding.fabNewProject.setOnClickListener {
            navigateToNewProject()
        }
    }
    
    private fun setupNavigation() {
        val navController = findNavController(R.id.nav_host_fragment)
        
        // Setup bottom navigation
        binding.bottomNavigation.setupWithNavController(navController)
        
        // Setup app bar configuration
        val appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.projectsFragment,
                R.id.editorFragment,
                R.id.aiChatFragment,
                R.id.terminalFragment,
                R.id.settingsFragment
            )
        )
        setupActionBarWithNavController(navController, appBarConfiguration)
        
        // Handle navigation changes
        navController.addOnDestinationChangedListener { _, destination, _ ->
            when (destination.id) {
                R.id.projectsFragment -> {
                    binding.fabNewProject.show()
                    supportActionBar?.title = getString(R.string.nav_projects)
                }
                R.id.editorFragment -> {
                    binding.fabNewProject.hide()
                    supportActionBar?.title = getString(R.string.nav_editor)
                }
                R.id.aiChatFragment -> {
                    binding.fabNewProject.hide()
                    supportActionBar?.title = getString(R.string.nav_ai_chat)
                }
                R.id.terminalFragment -> {
                    binding.fabNewProject.hide()
                    supportActionBar?.title = getString(R.string.nav_terminal)
                }
                R.id.settingsFragment -> {
                    binding.fabNewProject.hide()
                    supportActionBar?.title = getString(R.string.nav_settings)
                }
            }
        }
    }
    
    private fun checkPermissions() {
        if (!permissionManager.checkAllPermissions(this)) {
            showPermissionDialog()
        }
    }
    
    private fun showPermissionDialog() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Permissions Required")
            .setMessage("Coder needs access to storage and network to function properly. Please grant the required permissions.")
            .setPositiveButton("Grant Permissions") { _, _ ->
                requestPermissions()
            }
            .setNegativeButton("Exit") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun requestPermissions() {
        permissionManager.requestAllPermissions(
            this,
            onPermissionsGranted = {
                Snackbar.make(binding.root, "Permissions granted successfully!", Snackbar.LENGTH_SHORT).show()
            },
            onPermissionsDenied = { deniedPermissions ->
                val message = "Some permissions were denied: ${deniedPermissions.joinToString(", ") { 
                    permissionManager.getReadablePermissionName(it) 
                }}"
                Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
            },
            onPermissionsPermanentlyDenied = { permanentlyDenied ->
                showPermanentlyDeniedDialog(permanentlyDenied)
            }
        )
    }
    
    private fun showPermanentlyDeniedDialog(deniedPermissions: List<String>) {
        val permissionNames = deniedPermissions.joinToString(", ") { 
            permissionManager.getReadablePermissionName(it) 
        }
        
        MaterialAlertDialogBuilder(this)
            .setTitle("Permissions Required")
            .setMessage("The following permissions have been permanently denied: $permissionNames\n\nPlease enable them in the app settings to use all features.")
            .setPositiveButton("Open Settings") { _, _ ->
                // Navigate to app settings
                startActivity(android.content.Intent().apply {
                    action = android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                    data = android.net.Uri.fromParts("package", packageName, null)
                })
            }
            .setNegativeButton("Continue") { _, _ ->
                // Continue with limited functionality
            }
            .show()
    }
    
    private fun navigateToNewProject() {
        // This will be implemented when we create the project creation dialog
        val navController = findNavController(R.id.nav_host_fragment)
        if (navController.currentDestination?.id != R.id.projectsFragment) {
            navController.navigate(R.id.projectsFragment)
        }
        // TODO: Show new project dialog
    }
    
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_search -> {
                // TODO: Implement search functionality
                true
            }
            R.id.action_sync -> {
                // TODO: Implement sync functionality
                true
            }
            R.id.action_help -> {
                // TODO: Show help/about dialog
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
    
    override fun onSupportNavigateUp(): Boolean {
        val navController = findNavController(R.id.nav_host_fragment)
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
