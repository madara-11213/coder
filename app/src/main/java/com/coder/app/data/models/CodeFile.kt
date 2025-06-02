package com.coder.app.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ForeignKey
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.util.*

@Parcelize
@Entity(
    tableName = "files",
    foreignKeys = [
        ForeignKey(
            entity = Project::class,
            parentColumns = ["id"],
            childColumns = ["projectId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CodeFile(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val projectId: String,
    val name: String,
    val path: String,
    val relativePath: String,
    val content: String = "",
    val language: CodeLanguage = CodeLanguage.PLAIN_TEXT,
    val size: Long = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val lastModified: Long = System.currentTimeMillis(),
    val isDirectory: Boolean = false,
    val parentDirectory: String? = null
) : Parcelable

enum class CodeLanguage(
    val displayName: String,
    val extensions: List<String>,
    val mimeType: String,
    val supportsExecution: Boolean = false
) {
    PLAIN_TEXT("Plain Text", listOf("txt"), "text/plain"),
    JAVA("Java", listOf("java"), "text/x-java-source", true),
    KOTLIN("Kotlin", listOf("kt", "kts"), "text/x-kotlin", true),
    PYTHON("Python", listOf("py", "pyw"), "text/x-python", true),
    JAVASCRIPT("JavaScript", listOf("js", "mjs"), "text/javascript", true),
    TYPESCRIPT("TypeScript", listOf("ts"), "text/x-typescript", true),
    HTML("HTML", listOf("html", "htm"), "text/html"),
    CSS("CSS", listOf("css"), "text/css"),
    CPP("C++", listOf("cpp", "cxx", "cc"), "text/x-c++src", true),
    C("C", listOf("c"), "text/x-csrc", true),
    HEADER("C/C++ Header", listOf("h", "hpp"), "text/x-chdr"),
    JSON("JSON", listOf("json"), "application/json"),
    XML("XML", listOf("xml"), "text/xml"),
    MARKDOWN("Markdown", listOf("md", "markdown"), "text/markdown"),
    YAML("YAML", listOf("yml", "yaml"), "text/yaml"),
    SQL("SQL", listOf("sql"), "text/x-sql", true),
    SHELL("Shell Script", listOf("sh", "bash"), "text/x-shellscript", true),
    BATCH("Batch Script", listOf("bat", "cmd"), "text/x-msdos-batch", true),
    GO("Go", listOf("go"), "text/x-go", true),
    RUST("Rust", listOf("rs"), "text/x-rust", true),
    SWIFT("Swift", listOf("swift"), "text/x-swift", true),
    PHP("PHP", listOf("php"), "text/x-php", true),
    RUBY("Ruby", listOf("rb"), "text/x-ruby", true),
    R("R", listOf("r", "R"), "text/x-r", true),
    SCALA("Scala", listOf("scala"), "text/x-scala", true),
    DART("Dart", listOf("dart"), "text/x-dart", true);
    
    companion object {
        fun fromExtension(extension: String): CodeLanguage {
            return values().find { 
                it.extensions.contains(extension.lowercase()) 
            } ?: PLAIN_TEXT
        }
        
        fun fromFileName(fileName: String): CodeLanguage {
            val extension = fileName.substringAfterLast('.', "")
            return fromExtension(extension)
        }
    }
}
