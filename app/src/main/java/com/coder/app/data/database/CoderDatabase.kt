package com.coder.app.data.database

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.coder.app.data.models.Project
import com.coder.app.data.models.CodeFile

@Database(
    entities = [
        Project::class,
        CodeFile::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class CoderDatabase : RoomDatabase() {
    
    abstract fun projectDao(): ProjectDao
    abstract fun fileDao(): FileDao
    
    companion object {
        @Volatile
        private var INSTANCE: CoderDatabase? = null
        
        fun getDatabase(context: Context): CoderDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CoderDatabase::class.java,
                    "coder_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
