package com.coder.app.ui.terminal

import android.os.Bundle
import androidx.navigation.NavArgs

data class TerminalFragmentArgs(
    val projectId: String? = null
) : NavArgs {
    
    companion object {
        @JvmStatic
        fun fromBundle(bundle: Bundle): TerminalFragmentArgs {
            val projectId = bundle.getString("projectId")
            return TerminalFragmentArgs(projectId)
        }
    }
    
    fun toBundle(): Bundle {
        val bundle = Bundle()
        projectId?.let { bundle.putString("projectId", it) }
        return bundle
    }
}
