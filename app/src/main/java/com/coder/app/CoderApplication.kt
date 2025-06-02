package com.coder.app

import android.app.Application
import androidx.room.Room
import com.coder.app.data.database.CoderDatabase
import com.coder.app.data.repository.ProjectRepository
import com.coder.app.data.repository.AIRepository
import com.coder.app.utils.FileManager
import com.coder.app.utils.PermissionManager

class CoderApplication : Application() {
    
    // Database
    val database by lazy {
        Room.databaseBuilder(
            applicationContext,
            CoderDatabase::class.java,
            "coder_database"
        ).build()
    }
    
    // Repositories
    val projectRepository by lazy {
        ProjectRepository(database.projectDao(), database.fileDao())
    }
    
    val aiRepository by lazy {
        AIRepository()
    }
    
    // Utilities
    val fileManager by lazy {
        FileManager(applicationContext)
    }
    
    val permissionManager by lazy {
        PermissionManager()
    }
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        
        // Initialize file system
        fileManager.initializeAppDirectories()
    }
    
    companion object {
        @Volatile
        private var instance: CoderApplication? = null
        
        fun getInstance(): CoderApplication {
            return instance ?: synchronized(this) {
                instance ?: throw IllegalStateException("Application not initialized")
            }
        }
    }
}
