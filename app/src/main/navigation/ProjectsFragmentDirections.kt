package com.coder.app.ui.projects

import androidx.navigation.ActionOnlyNavDirections
import androidx.navigation.NavDirections
import com.coder.app.R

class ProjectsFragmentDirections private constructor() {
    companion object {
        fun actionProjectsToEditor(projectId: String? = null, fileId: String? = null): NavDirections {
            return ActionOnlyNavDirections(R.id.action_projects_to_editor)
        }
    }
}
