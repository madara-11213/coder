package com.coder.app.data.database

import androidx.room.*
import com.coder.app.data.models.CodeFile
import kotlinx.coroutines.flow.Flow

@Dao
interface FileDao {
    
    @Query("SELECT * FROM files WHERE projectId = :projectId ORDER BY isDirectory DESC, name ASC")
    fun getFilesByProject(projectId: String): Flow<List<CodeFile>>
    
    @Query("SELECT * FROM files WHERE projectId = :projectId AND parentDirectory = :parentDir ORDER BY isDirectory DESC, name ASC")
    fun getFilesByDirectory(projectId: String, parentDir: String?): Flow<List<CodeFile>>
    
    @Query("SELECT * FROM files WHERE id = :fileId")
    suspend fun getFileById(fileId: String): CodeFile?
    
    @Query("SELECT * FROM files WHERE projectId = :projectId AND relativePath = :path")
    suspend fun getFileByPath(projectId: String, path: String): CodeFile?
    
    @Query("SELECT * FROM files WHERE projectId = :projectId AND isDirectory = 0 ORDER BY lastModified DESC LIMIT :limit")
    suspend fun getRecentFiles(projectId: String, limit: Int = 10): List<CodeFile>
    
    @Query("SELECT * FROM files WHERE projectId = :projectId AND name LIKE '%' || :query || '%'")
    suspend fun searchFiles(projectId: String, query: String): List<CodeFile>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFile(file: CodeFile): Long
    
    @Update
    suspend fun updateFile(file: CodeFile)
    
    @Delete
    suspend fun deleteFile(file: CodeFile)
    
    @Query("DELETE FROM files WHERE id = :fileId")
    suspend fun deleteFileById(fileId: String)
    
    @Query("DELETE FROM files WHERE projectId = :projectId AND parentDirectory LIKE :directoryPath || '%'")
    suspend fun deleteDirectory(projectId: String, directoryPath: String)
    
    @Query("UPDATE files SET content = :content, lastModified = :timestamp, size = :size WHERE id = :fileId")
    suspend fun updateFileContent(fileId: String, content: String, size: Long, timestamp: Long = System.currentTimeMillis())
    
    @Query("SELECT COUNT(*) FROM files WHERE projectId = :projectId AND isDirectory = 0")
    suspend fun getFileCount(projectId: String): Int
    
    @Query("SELECT SUM(size) FROM files WHERE projectId = :projectId AND isDirectory = 0")
    suspend fun getProjectSize(projectId: String): Long
}
