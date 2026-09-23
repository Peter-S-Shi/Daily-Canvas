//! Daily Canvas desktop shell.
//!
//! The shell only exposes narrow native adapters. Domain logic, storage
//! (Dexie/IndexedDB) and every product rule stay in the web application.

use serde::Serialize;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use tauri::{ipc::Request, AppHandle, Manager, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopInfo {
    app_version: String,
    identifier: String,
    app_local_data_dir: String,
    webview_data_dir: String,
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 3 <= bytes.len() {
            if let Some(v) = input.get(i + 1..i + 3).and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Where application-owned data lives (evidence for the desktop data boundary).
#[tauri::command]
fn desktop_info(app: AppHandle) -> Result<DesktopInfo, String> {
    let local = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(DesktopInfo {
        app_version: app.package_info().version.to_string(),
        identifier: app.config().identifier.clone(),
        app_local_data_dir: local.display().to_string(),
        webview_data_dir: local.join("EBWebView").display().to_string(),
    })
}

/// Shows a native Save dialog and writes the raw request body to the chosen path.
/// The path never crosses into JavaScript before the user confirms it, and no
/// general-purpose filesystem capability is granted to the web layer.
/// Returns the saved path, or `None` when the user cancelled.
#[tauri::command]
async fn save_export(app: AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected a raw binary body".into());
    };
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .unwrap_or_else(|| "daily-canvas-export".into());
    let mut dialog = app.dialog().file().set_file_name(&name);
    // Start in Downloads (where a browser download would land), not in the process working directory.
    if let Ok(dir) = app.path().download_dir() {
        dialog = dialog.set_directory(dir);
    }
    if let Some(ext) = name.rsplit('.').next().filter(|e| *e != name) {
        dialog = dialog.add_filter(ext.to_uppercase(), &[ext]);
    }
    let Some(picked) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

/// Opens the WebView2 print surface (Print / Save as PDF) for the current page.
#[tauri::command]
fn print_page(window: WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

/// Local Time Block reminder notification. Fires only while Daily Canvas is running and the
/// process is calling this command directly -- no resident service, tray, or OS task scheduler
/// is registered behind it.
#[tauri::command]
fn send_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

// --- Milestone 13: Automatic Rotating Backup native adapter ------------------------------------
//
// Only four narrow commands are exposed (write, list, read, delete); no general-purpose filesystem
// capability is granted to the web layer. Retention/rotation decisions and the "once per local
// day" policy live in the TypeScript `autoBackupService`, which orchestrates these primitives --
// exactly as `backupService.ts` already orchestrates the manual export/import flow.

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupFileInfo {
    file_name: String,
    size_bytes: u64,
}

fn backup_dir_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Rejects any file name that could escape the backup directory (no path separators, no `..`).
fn safe_backup_path(dir: &Path, file_name: &str) -> Result<PathBuf, String> {
    if file_name.is_empty()
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains("..")
    {
        return Err("Invalid backup file name.".into());
    }
    Ok(dir.join(file_name))
}

/// Shows the app-owned local backup directory, so Settings -> Data & Backup can display an
/// explicit, understandable location rather than a hidden temp path.
#[tauri::command]
fn backup_directory(app: AppHandle) -> Result<String, String> {
    Ok(backup_dir_path(&app)?.display().to_string())
}

/// Writes one automatic backup. Writes to a temporary file in the same directory, then atomically
/// renames it into place, so a crash or failure never leaves a torn/partial backup file visible to
/// `list_auto_backups`.
#[tauri::command]
async fn write_auto_backup(app: AppHandle, request: Request<'_>) -> Result<BackupFileInfo, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected a raw binary body".into());
    };
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .ok_or_else(|| "missing x-file-name header".to_string())?;
    let dir = backup_dir_path(&app)?;
    let final_path = safe_backup_path(&dir, &name)?;
    let tmp_path = dir.join(format!("{name}.tmp"));
    fs::write(&tmp_path, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &final_path).map_err(|e| e.to_string())?;
    let size_bytes = fs::metadata(&final_path).map_err(|e| e.to_string())?.len();
    Ok(BackupFileInfo {
        file_name: name,
        size_bytes,
    })
}

/// Lists retained automatic backups, most recent first (file names are sortable timestamps).
#[tauri::command]
fn list_auto_backups(app: AppHandle) -> Result<Vec<BackupFileInfo>, String> {
    let dir = backup_dir_path(&app)?;
    let mut entries: Vec<BackupFileInfo> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .file_name()
                .to_str()
                .map(|n| n.ends_with(".json") && !n.ends_with(".tmp"))
                .unwrap_or(false)
        })
        .filter_map(|entry| {
            let file_name = entry.file_name().to_str()?.to_string();
            let size_bytes = entry.metadata().ok()?.len();
            Some(BackupFileInfo {
                file_name,
                size_bytes,
            })
        })
        .collect();
    entries.sort_by(|a, b| b.file_name.cmp(&a.file_name));
    Ok(entries)
}

/// Reads one retained automatic backup's raw JSON content for the restore-preview pipeline (the
/// same `migrateBackup`/`restoreBackup` pipeline manual import already uses).
#[tauri::command]
fn read_auto_backup(app: AppHandle, file_name: String) -> Result<String, String> {
    let dir = backup_dir_path(&app)?;
    let path = safe_backup_path(&dir, &file_name)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Deletes one retained automatic backup. Only ever called by the TypeScript retention policy
/// after a new backup has already been written successfully -- old backups are never pruned first.
#[tauri::command]
fn delete_auto_backup(app: AppHandle, file_name: String) -> Result<(), String> {
    let dir = backup_dir_path(&app)?;
    let path = safe_backup_path(&dir, &file_name)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            desktop_info,
            save_export,
            print_page,
            send_notification,
            backup_directory,
            write_auto_backup,
            list_auto_backups,
            read_auto_backup,
            delete_auto_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running Daily Canvas");
}
