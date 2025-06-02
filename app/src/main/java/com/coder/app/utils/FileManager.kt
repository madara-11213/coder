package com.coder.app.utils

import android.content.Context
import android.os.Environment
import com.coder.app.data.models.CodeFile
import com.coder.app.data.models.CodeLanguage
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class FileManager(private val context: Context) {
    
    companion object {
        private const val APP_DIRECTORY = "Coder"
        private const val PROJECTS_DIRECTORY = "Projects"
        private const val TEMP_DIRECTORY = "Temp"
        private const val BACKUPS_DIRECTORY = "Backups"
    }
    
    private val appDir: File by lazy {
        File(context.getExternalFilesDir(null), APP_DIRECTORY)
    }
    
    private val projectsDir: File by lazy {
        File(appDir, PROJECTS_DIRECTORY)
    }
    
    private val tempDir: File by lazy {
        File(appDir, TEMP_DIRECTORY)
    }
    
    private val backupsDir: File by lazy {
        File(appDir, BACKUPS_DIRECTORY)
    }
    
    fun initializeAppDirectories() {
        try {
            appDir.mkdirs()
            projectsDir.mkdirs()
            tempDir.mkdirs()
            backupsDir.mkdirs()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun getProjectsDirectory(): File = projectsDir
    
    fun getTempDirectory(): File = tempDir
    
    fun getBackupsDirectory(): File = backupsDir
    
    fun createProjectDirectory(projectName: String): Result<File> {
        return try {
            val projectDir = File(projectsDir, projectName)
            if (projectDir.exists()) {
                return Result.failure(IllegalArgumentException("Project directory already exists"))
            }
            
            if (projectDir.mkdirs()) {
                Result.success(projectDir)
            } else {
                Result.failure(IOException("Failed to create project directory"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun writeFile(file: CodeFile): Result<Unit> {
        return try {
            val systemFile = File(file.path)
            systemFile.parentFile?.mkdirs()
            systemFile.writeText(file.content)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun readFile(filePath: String): Result<String> {
        return try {
            val file = File(filePath)
            if (!file.exists()) {
                return Result.failure(IOException("File does not exist"))
            }
            
            val content = file.readText()
            Result.success(content)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun deleteFile(filePath: String): Result<Unit> {
        return try {
            val file = File(filePath)
            if (file.exists()) {
                if (file.isDirectory) {
                    file.deleteRecursively()
                } else {
                    file.delete()
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun renameFile(oldPath: String, newName: String): Result<String> {
        return try {
            val oldFile = File(oldPath)
            if (!oldFile.exists()) {
                return Result.failure(IOException("File does not exist"))
            }
            
            val newFile = File(oldFile.parent, newName)
            if (newFile.exists()) {
                return Result.failure(IllegalArgumentException("File with new name already exists"))
            }
            
            if (oldFile.renameTo(newFile)) {
                Result.success(newFile.absolutePath)
            } else {
                Result.failure(IOException("Failed to rename file"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun copyFile(sourcePath: String, destinationPath: String): Result<Unit> {
        return try {
            val sourceFile = File(sourcePath)
            val destFile = File(destinationPath)
            
            if (!sourceFile.exists()) {
                return Result.failure(IOException("Source file does not exist"))
            }
            
            destFile.parentFile?.mkdirs()
            sourceFile.copyTo(destFile, overwrite = true)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun getFileSize(filePath: String): Long {
        return try {
            File(filePath).length()
        } catch (e: Exception) {
            0L
        }
    }
    
    fun getFileExtension(fileName: String): String {
        return fileName.substringAfterLast('.', "")
    }
    
    fun isValidFileName(fileName: String): Boolean {
        if (fileName.isBlank()) return false
        
        val invalidChars = charArrayOf('/', '\\', ':', '*', '?', '"', '<', '>', '|')
        return !fileName.any { it in invalidChars }
    }
    
    fun listFiles(directoryPath: String): List<File> {
        return try {
            val directory = File(directoryPath)
            if (directory.exists() && directory.isDirectory) {
                directory.listFiles()?.toList() ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    fun searchFiles(directoryPath: String, query: String, recursive: Boolean = true): List<File> {
        val results = mutableListOf<File>()
        
        fun searchInDirectory(directory: File) {
            try {
                directory.listFiles()?.forEach { file ->
                    if (file.name.contains(query, ignoreCase = true)) {
                        results.add(file)
                    }
                    
                    if (recursive && file.isDirectory) {
                        searchInDirectory(file)
                    }
                }
            } catch (e: Exception) {
                // Ignore and continue
            }
        }
        
        val rootDir = File(directoryPath)
        if (rootDir.exists() && rootDir.isDirectory) {
            searchInDirectory(rootDir)
        }
        
        return results
    }
    
    fun createBackup(projectPath: String, projectName: String): Result<File> {
        return try {
            val timestamp = System.currentTimeMillis()
            val backupFileName = "${projectName}_backup_$timestamp.zip"
            val backupFile = File(backupsDir, backupFileName)
            
            zipDirectory(File(projectPath), backupFile)
            Result.success(backupFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun restoreBackup(backupFilePath: String, restoreLocation: String): Result<Unit> {
        return try {
            val backupFile = File(backupFilePath)
            val restoreDir = File(restoreLocation)
            
            if (!backupFile.exists()) {
                return Result.failure(IOException("Backup file does not exist"))
            }
            
            unzipFile(backupFile, restoreDir)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun zipDirectory(sourceDir: File, zipFile: File) {
        ZipOutputStream(FileOutputStream(zipFile)).use { zos ->
            zipDirectoryRecursive(sourceDir, sourceDir.name, zos)
        }
    }
    
    private fun zipDirectoryRecursive(fileToZip: File, fileName: String, zos: ZipOutputStream) {
        if (fileToZip.isHidden) {
            return
        }
        
        if (fileToZip.isDirectory) {
            val entry = if (fileName.endsWith("/")) {
                ZipEntry(fileName)
            } else {
                ZipEntry("$fileName/")
            }
            zos.putNextEntry(entry)
            zos.closeEntry()
            
            fileToZip.listFiles()?.forEach { childFile ->
                zipDirectoryRecursive(childFile, "$fileName/${childFile.name}", zos)
            }
        } else {
            FileInputStream(fileToZip).use { fis ->
                val zipEntry = ZipEntry(fileName)
                zos.putNextEntry(zipEntry)
                
                val buffer = ByteArray(1024)
                var length: Int
                while (fis.read(buffer).also { length = it } >= 0) {
                    zos.write(buffer, 0, length)
                }
                zos.closeEntry()
            }
        }
    }
    
    private fun unzipFile(zipFile: File, destDir: File) {
        destDir.mkdirs()
        
        ZipInputStream(FileInputStream(zipFile)).use { zis ->
            var entry: ZipEntry? = zis.nextEntry
            
            while (entry != null) {
                val file = File(destDir, entry.name)
                
                if (entry.isDirectory) {
                    file.mkdirs()
                } else {
                    file.parentFile?.mkdirs()
                    FileOutputStream(file).use { fos ->
                        val buffer = ByteArray(1024)
                        var length: Int
                        while (zis.read(buffer).also { length = it } > 0) {
                            fos.write(buffer, 0, length)
                        }
                    }
                }
                
                entry = zis.nextEntry
            }
        }
    }
    
    fun cleanTempDirectory() {
        try {
            tempDir.listFiles()?.forEach { file ->
                file.deleteRecursively()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun getFileInfo(filePath: String): Map<String, Any> {
        val file = File(filePath)
        return mapOf(
            "name" to file.name,
            "path" to file.absolutePath,
            "size" to file.length(),
            "lastModified" to file.lastModified(),
            "isDirectory" to file.isDirectory,
            "isHidden" to file.isHidden,
            "canRead" to file.canRead(),
            "canWrite" to file.canWrite(),
            "extension" to getFileExtension(file.name),
            "language" to CodeLanguage.fromFileName(file.name).displayName
        )
    }
}
