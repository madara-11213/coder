package com.coder.app.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.util.*

@Parcelize
@Entity(tableName = "projects")
data class Project(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String? = null,
    val path: String,
    val template: ProjectTemplate = ProjectTemplate.EMPTY,
    val language: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val lastModified: Long = System.currentTimeMillis(),
    val isGitRepository: Boolean = false,
    val gitRemoteUrl: String? = null,
    val currentBranch: String? = null
) : Parcelable

enum class ProjectTemplate(val displayName: String, val extensions: List<String>) {
    EMPTY("Empty Project", emptyList()),
    JAVA("Java Console App", listOf("java")),
    PYTHON("Python Script", listOf("py")),
    JAVASCRIPT("JavaScript/Node.js", listOf("js", "json")),
    HTML("HTML/CSS/JS Website", listOf("html", "css", "js")),
    ANDROID("Android App", listOf("java", "kt", "xml")),
    CPP("C++ Console App", listOf("cpp", "h", "c")),
    GO("Go Application", listOf("go")),
    RUST("Rust Application", listOf("rs")),
    SWIFT("Swift Application", listOf("swift"))
}
