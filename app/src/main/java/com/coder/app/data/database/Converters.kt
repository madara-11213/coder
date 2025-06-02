package com.coder.app.data.database

import androidx.room.TypeConverter
import com.coder.app.data.models.ProjectTemplate
import com.coder.app.data.models.CodeLanguage

class Converters {
    
    @TypeConverter
    fun fromProjectTemplate(template: ProjectTemplate): String {
        return template.name
    }
    
    @TypeConverter
    fun toProjectTemplate(templateName: String): ProjectTemplate {
        return try {
            ProjectTemplate.valueOf(templateName)
        } catch (e: IllegalArgumentException) {
            ProjectTemplate.EMPTY
        }
    }
    
    @TypeConverter
    fun fromCodeLanguage(language: CodeLanguage): String {
        return language.name
    }
    
    @TypeConverter
    fun toCodeLanguage(languageName: String): CodeLanguage {
        return try {
            CodeLanguage.valueOf(languageName)
        } catch (e: IllegalArgumentException) {
            CodeLanguage.PLAIN_TEXT
        }
    }
}
