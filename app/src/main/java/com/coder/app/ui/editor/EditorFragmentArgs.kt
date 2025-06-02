package com.coder.app.ui.editor

import android.os.Bundle
import androidx.navigation.NavArgs
import java.io.Serializable

data class EditorFragmentArgs(
    val projectId: String? = null,
    val fileId: String? = null
) : NavArgs {
    
    companion object {
        @JvmStatic
        fun fromBundle(bundle: Bundle): EditorFragmentArgs {
            val projectId = bundle.getString("projectId")
            val fileId = bundle.getString("fileId")
            return EditorFragmentArgs(projectId, fileId)
        }
    }
    
    fun toBundle(): Bundle {
        val bundle = Bundle()
        projectId?.let { bundle.putString("projectId", it) }
        fileId?.let { bundle.putString("fileId", it) }
        return bundle
    }
}
