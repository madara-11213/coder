package com.coder.app.data.database

import androidx.room.*
import com.coder.app.data.models.Project
import kotlinx.coroutines.flow.Flow

@Dao
interface ProjectDao {
    
    @Query("SELECT * FROM projects ORDER BY lastModified DESC")
    fun getAllProjects(): Flow<List<Project>>
    
    @Query("SELECT * FROM projects WHERE id = :projectId")
    suspend fun getProjectById(projectId: String): Project?
    
    @Query("SELECT * FROM projects WHERE name = :name")
    suspend fun getProjectByName(name: String): Project?
    
    @Query("SELECT * FROM projects ORDER BY lastModified DESC LIMIT :limit")
    suspend fun getRecentProjects(limit: Int = 10): List<Project>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProject(project: Project): Long
    
    @Update
    suspend fun updateProject(project: Project)
    
    @Delete
    suspend fun deleteProject(project: Project)
    
    @Query("DELETE FROM projects WHERE id = :projectId")
    suspend fun deleteProjectById(projectId: String)
    
    @Query("UPDATE projects SET lastModified = :timestamp WHERE id = :projectId")
    suspend fun updateLastModified(projectId: String, timestamp: Long = System.currentTimeMillis())
    
    @Query("UPDATE projects SET isGitRepository = :isGit, currentBranch = :branch WHERE id = :projectId")
    suspend fun updateGitInfo(projectId: String, isGit: Boolean, branch: String?)
    
    @Query("SELECT COUNT(*) FROM projects")
    suspend fun getProjectCount(): Int
}
