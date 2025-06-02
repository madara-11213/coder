package com.coder.app.utils

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.karumi.dexter.Dexter
import com.karumi.dexter.MultiplePermissionsReport
import com.karumi.dexter.PermissionToken
import com.karumi.dexter.listener.PermissionRequest
import com.karumi.dexter.listener.multi.MultiplePermissionsListener

class PermissionManager {
    
    companion object {
        const val REQUEST_CODE_STORAGE = 100
        const val REQUEST_CODE_MANAGE_STORAGE = 101
        
        private val STORAGE_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_AUDIO
            )
        } else {
            arrayOf(
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            )
        }
        
        private val REQUIRED_PERMISSIONS = STORAGE_PERMISSIONS + arrayOf(
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.WAKE_LOCK,
            Manifest.permission.VIBRATE
        )
    }
    
    fun checkStoragePermissions(context: Context): Boolean {
        return STORAGE_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun checkAllPermissions(context: Context): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun requestStoragePermissions(
        activity: Activity,
        onPermissionsGranted: () -> Unit,
        onPermissionsDenied: (List<String>) -> Unit,
        onPermissionsPermanentlyDenied: (List<String>) -> Unit
    ) {
        requestPermissions(
            activity,
            STORAGE_PERMISSIONS.toList(),
            onPermissionsGranted,
            onPermissionsDenied,
            onPermissionsPermanentlyDenied
        )
    }
    
    fun requestAllPermissions(
        activity: Activity,
        onPermissionsGranted: () -> Unit,
        onPermissionsDenied: (List<String>) -> Unit,
        onPermissionsPermanentlyDenied: (List<String>) -> Unit
    ) {
        requestPermissions(
            activity,
            REQUIRED_PERMISSIONS.toList(),
            onPermissionsGranted,
            onPermissionsDenied,
            onPermissionsPermanentlyDenied
        )
    }
    
    private fun requestPermissions(
        activity: Activity,
        permissions: List<String>,
        onPermissionsGranted: () -> Unit,
        onPermissionsDenied: (List<String>) -> Unit,
        onPermissionsPermanentlyDenied: (List<String>) -> Unit
    ) {
        Dexter.withActivity(activity)
            .withPermissions(permissions)
            .withListener(object : MultiplePermissionsListener {
                override fun onPermissionsChecked(report: MultiplePermissionsReport) {
                    when {
                        report.areAllPermissionsGranted() -> {
                            onPermissionsGranted()
                        }
                        report.isAnyPermissionPermanentlyDenied -> {
                            val permanentlyDenied = report.deniedPermissionResponses
                                .filter { it.isPermanentlyDenied }
                                .map { it.permissionName }
                            onPermissionsPermanentlyDenied(permanentlyDenied)
                        }
                        else -> {
                            val denied = report.deniedPermissionResponses
                                .map { it.permissionName }
                            onPermissionsDenied(denied)
                        }
                    }
                }
                
                override fun onPermissionRationaleShouldBeShown(
                    permissions: List<PermissionRequest>,
                    token: PermissionToken
                ) {
                    token.continuePermissionRequest()
                }
            })
            .check()
    }
    
    fun shouldShowRequestPermissionRationale(activity: Activity, permission: String): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
    }
    
    fun getPermissionStatus(context: Context, permission: String): PermissionStatus {
        return when {
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED -> {
                PermissionStatus.GRANTED
            }
            ActivityCompat.shouldShowRequestPermissionRationale(context as Activity, permission) -> {
                PermissionStatus.DENIED_CAN_ASK_AGAIN
            }
            else -> {
                PermissionStatus.DENIED_PERMANENTLY
            }
        }
    }
    
    fun getStoragePermissionStatus(context: Context): Map<String, PermissionStatus> {
        return STORAGE_PERMISSIONS.associateWith { permission ->
            getPermissionStatus(context, permission)
        }
    }
    
    fun getAllPermissionStatus(context: Context): Map<String, PermissionStatus> {
        return REQUIRED_PERMISSIONS.associateWith { permission ->
            getPermissionStatus(context, permission)
        }
    }
    
    fun getReadablePermissionName(permission: String): String {
        return when (permission) {
            Manifest.permission.READ_EXTERNAL_STORAGE -> "Read Storage"
            Manifest.permission.WRITE_EXTERNAL_STORAGE -> "Write Storage"
            Manifest.permission.READ_MEDIA_IMAGES -> "Read Images"
            Manifest.permission.READ_MEDIA_VIDEO -> "Read Videos"
            Manifest.permission.READ_MEDIA_AUDIO -> "Read Audio"
            Manifest.permission.INTERNET -> "Internet Access"
            Manifest.permission.ACCESS_NETWORK_STATE -> "Network State"
            Manifest.permission.WAKE_LOCK -> "Wake Lock"
            Manifest.permission.VIBRATE -> "Vibrate"
            else -> permission.substringAfterLast('.').replace('_', ' ')
                .split(' ').joinToString(" ") { it.lowercase().replaceFirstChar(Char::titlecase) }
        }
    }
    
    fun getPermissionDescription(permission: String): String {
        return when (permission) {
            Manifest.permission.READ_EXTERNAL_STORAGE -> "Required to read and import code files from external storage"
            Manifest.permission.WRITE_EXTERNAL_STORAGE -> "Required to save and export code files to external storage"
            Manifest.permission.READ_MEDIA_IMAGES -> "Required to access image files for projects"
            Manifest.permission.READ_MEDIA_VIDEO -> "Required to access video files for projects"
            Manifest.permission.READ_MEDIA_AUDIO -> "Required to access audio files for projects"
            Manifest.permission.INTERNET -> "Required to communicate with AI services and download resources"
            Manifest.permission.ACCESS_NETWORK_STATE -> "Required to check internet connectivity"
            Manifest.permission.WAKE_LOCK -> "Required to keep the device awake during code execution"
            Manifest.permission.VIBRATE -> "Required to provide haptic feedback"
            else -> "Required for app functionality"
        }
    }
}

enum class PermissionStatus {
    GRANTED,
    DENIED_CAN_ASK_AGAIN,
    DENIED_PERMANENTLY
}
