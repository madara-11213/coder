package com.coder.app.data.repository

import com.coder.app.data.database.ProjectDao
import com.coder.app.data.database.FileDao
import com.coder.app.data.models.Project
import com.coder.app.data.models.CodeFile
import com.coder.app.data.models.ProjectTemplate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class ProjectRepository(
    private val projectDao: ProjectDao,
    private val fileDao: FileDao
) {
    
    fun getAllProjects(): Flow<List<Project>> = projectDao.getAllProjects()
    
    suspend fun getProjectById(projectId: String): Project? = projectDao.getProjectById(projectId)
    
    suspend fun getRecentProjects(limit: Int = 10): List<Project> = projectDao.getRecentProjects(limit)
    
    suspend fun createProject(
        name: String,
        description: String?,
        path: String,
        template: ProjectTemplate = ProjectTemplate.EMPTY
    ): Result<Project> = withContext(Dispatchers.IO) {
        try {
            // Create project directory
            val projectDir = File(path, name)
            if (!projectDir.exists()) {
                projectDir.mkdirs()
            }
            
            val project = Project(
                name = name,
                description = description,
                path = projectDir.absolutePath,
                template = template
            )
            
            // Insert project into database
            projectDao.insertProject(project)
            
            // Create template files if specified
            createTemplateFiles(project)
            
            Result.success(project)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateProject(project: Project) = projectDao.updateProject(project)
    
    suspend fun deleteProject(project: Project): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Delete project directory
            val projectDir = File(project.path)
            if (projectDir.exists()) {
                projectDir.deleteRecursively()
            }
            
            // Delete from database (files will be deleted by foreign key cascade)
            projectDao.deleteProject(project)
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun importProject(projectPath: String): Result<Project> = withContext(Dispatchers.IO) {
        try {
            val projectDir = File(projectPath)
            if (!projectDir.exists() || !projectDir.isDirectory) {
                return@withContext Result.failure(IllegalArgumentException("Invalid project path"))
            }
            
            val project = Project(
                name = projectDir.name,
                path = projectDir.absolutePath,
                template = detectProjectTemplate(projectDir)
            )
            
            projectDao.insertProject(project)
            
            // Scan and import existing files
            scanAndImportFiles(project, projectDir)
            
            Result.success(project)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private suspend fun createTemplateFiles(project: Project) {
        when (project.template) {
            ProjectTemplate.JAVA -> {
                val mainJava = CodeFile(
                    projectId = project.id,
                    name = "Main.java",
                    path = "${project.path}/Main.java",
                    relativePath = "Main.java",
                    content = getJavaTemplate(project.name),
                    language = com.coder.app.data.models.CodeLanguage.JAVA
                )
                fileDao.insertFile(mainJava)
                writeFileToSystem(mainJava)
            }
            ProjectTemplate.PYTHON -> {
                val mainPy = CodeFile(
                    projectId = project.id,
                    name = "main.py",
                    path = "${project.path}/main.py",
                    relativePath = "main.py",
                    content = getPythonTemplate(project.name),
                    language = com.coder.app.data.models.CodeLanguage.PYTHON
                )
                fileDao.insertFile(mainPy)
                writeFileToSystem(mainPy)
            }
            ProjectTemplate.HTML -> {
                val files = listOf(
                    CodeFile(
                        projectId = project.id,
                        name = "index.html",
                        path = "${project.path}/index.html",
                        relativePath = "index.html",
                        content = getHtmlTemplate(project.name),
                        language = com.coder.app.data.models.CodeLanguage.HTML
                    ),
                    CodeFile(
                        projectId = project.id,
                        name = "style.css",
                        path = "${project.path}/style.css",
                        relativePath = "style.css",
                        content = getCssTemplate(),
                        language = com.coder.app.data.models.CodeLanguage.CSS
                    ),
                    CodeFile(
                        projectId = project.id,
                        name = "script.js",
                        path = "${project.path}/script.js",
                        relativePath = "script.js",
                        content = getJavascriptTemplate(),
                        language = com.coder.app.data.models.CodeLanguage.JAVASCRIPT
                    )
                )
                files.forEach { file ->
                    fileDao.insertFile(file)
                    writeFileToSystem(file)
                }
            }
            else -> {
                // Create empty README for other templates
                val readme = CodeFile(
                    projectId = project.id,
                    name = "README.md",
                    path = "${project.path}/README.md",
                    relativePath = "README.md",
                    content = "# ${project.name}\n\n${project.description ?: "A new project created with Coder"}",
                    language = com.coder.app.data.models.CodeLanguage.MARKDOWN
                )
                fileDao.insertFile(readme)
                writeFileToSystem(readme)
            }
        }
    }
    
    private suspend fun scanAndImportFiles(project: Project, directory: File, relativePath: String = "") {
        directory.listFiles()?.forEach { file ->
            if (file.isDirectory) {
                val dirFile = CodeFile(
                    projectId = project.id,
                    name = file.name,
                    path = file.absolutePath,
                    relativePath = if (relativePath.isEmpty()) file.name else "$relativePath/${file.name}",
                    isDirectory = true,
                    parentDirectory = relativePath.ifEmpty { null }
                )
                fileDao.insertFile(dirFile)
                
                scanAndImportFiles(project, file, dirFile.relativePath)
            } else {
                val content = try {
                    file.readText()
                } catch (e: Exception) {
                    ""
                }
                
                val codeFile = CodeFile(
                    projectId = project.id,
                    name = file.name,
                    path = file.absolutePath,
                    relativePath = if (relativePath.isEmpty()) file.name else "$relativePath/${file.name}",
                    content = content,
                    language = com.coder.app.data.models.CodeLanguage.fromFileName(file.name),
                    size = file.length(),
                    lastModified = file.lastModified(),
                    parentDirectory = relativePath.ifEmpty { null }
                )
                fileDao.insertFile(codeFile)
            }
        }
    }
    
    private fun detectProjectTemplate(directory: File): ProjectTemplate {
        val files = directory.listFiles()?.map { it.name } ?: emptyList()
        
        return when {
            files.any { it.endsWith(".java") } -> ProjectTemplate.JAVA
            files.any { it.endsWith(".py") } -> ProjectTemplate.PYTHON
            files.any { it.endsWith(".js") && files.contains("package.json") } -> ProjectTemplate.JAVASCRIPT
            files.contains("index.html") -> ProjectTemplate.HTML
            files.any { it.endsWith(".cpp") || it.endsWith(".c") } -> ProjectTemplate.CPP
            files.any { it.endsWith(".go") } -> ProjectTemplate.GO
            files.any { it.endsWith(".rs") } -> ProjectTemplate.RUST
            else -> ProjectTemplate.EMPTY
        }
    }
    
    private fun writeFileToSystem(file: CodeFile) {
        try {
            val systemFile = File(file.path)
            systemFile.parentFile?.mkdirs()
            systemFile.writeText(file.content)
        } catch (e: Exception) {
            // Handle error silently for now
        }
    }
    
    // Template content methods
    private fun getJavaTemplate(projectName: String) = """
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, $projectName!");
    }
}
    """.trimIndent()
    
    private fun getPythonTemplate(projectName: String) = """
def main():
    print("Hello, $projectName!")

if __name__ == "__main__":
    main()
    """.trimIndent()
    
    private fun getHtmlTemplate(projectName: String) = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$projectName</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to $projectName</h1>
    <p>This is a simple HTML page created with Coder.</p>
    <script src="script.js"></script>
</body>
</html>
    """.trimIndent()
    
    private fun getCssTemplate() = """
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f4f4f4;
}

h1 {
    color: #333;
    text-align: center;
}

p {
    color: #666;
    line-height: 1.6;
}
    """.trimIndent()
    
    private fun getJavascriptTemplate() = """
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded successfully!');
});
    """.trimIndent()
}
