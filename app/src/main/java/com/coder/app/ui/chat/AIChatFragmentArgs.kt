package com.coder.app.ui.chat

import android.os.Bundle
import androidx.navigation.NavArgs

data class AIChatFragmentArgs(
    val projectId: String? = null
) : NavArgs {
    
    companion object {
        @JvmStatic
        fun fromBundle(bundle: Bundle): AIChatFragmentArgs {
            val projectId = bundle.getString("projectId")
            return AIChatFragmentArgs(projectId)
        }
    }
    
    fun toBundle(): Bundle {
        val bundle = Bundle()
        projectId?.let { bundle.putString("projectId", it) }
        return bundle
    }
}
