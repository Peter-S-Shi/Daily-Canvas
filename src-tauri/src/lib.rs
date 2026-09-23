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

/// The exact naming convention `autoBackupService.ts`'s `fileNameFor` writes (`FILE_PREFIX` there).
/// `list_auto_backups`/retention/delete are scoped strictly to this namespace so that an unrelated
/// `.json` file dropped into the backup directory by something else is never listed, counted
/// toward the 7-item retention cap, or deleted by pruning.
const AUTO_BACKUP_PREFIX: &str = "daily-canvas-auto-backup-";

fn is_auto_backup_file_name(name: &str) -> bool {
    name.starts_with(AUTO_BACKUP_PREFIX) && name.ends_with(".json")
}

/// Pure directory scan behind `list_auto_backups`, factored out so it can be unit-tested against a
/// real temp directory without a running `AppHandle`.
fn scan_auto_backups(dir: &Path) -> Result<Vec<BackupFileInfo>, String> {
    let mut entries: Vec<BackupFileInfo> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .file_name()
                .to_str()
                .map(is_auto_backup_file_name)
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

/// Lists retained automatic backups, most recent first (file names are sortable timestamps).
#[tauri::command]
fn list_auto_backups(app: AppHandle) -> Result<Vec<BackupFileInfo>, String> {
    scan_auto_backups(&backup_dir_path(&app)?)
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
/// Refuses to delete anything outside the auto-backup namespace, even if asked, so this narrow
/// command can never be used to prune an unrelated file.
#[tauri::command]
fn delete_auto_backup(app: AppHandle, file_name: String) -> Result<(), String> {
    if !is_auto_backup_file_name(&file_name) {
        return Err("Refusing to delete a file outside the auto-backup namespace.".into());
    }
    let dir = backup_dir_path(&app)?;
    let path = safe_backup_path(&dir, &file_name)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod auto_backup_namespace_tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// A fresh, uniquely-named temp directory this test owns outright, so it can never collide
    /// with -- or endanger -- real user data or another test running concurrently.
    struct TempDir(PathBuf);
    impl TempDir {
        fn new(label: &str) -> Self {
            let n = COUNTER.fetch_add(1, Ordering::SeqCst);
            let dir = std::env::temp_dir().join(format!(
                "daily-canvas-auto-backup-namespace-test-{label}-{}-{n}",
                std::process::id()
            ));
            fs::create_dir_all(&dir).expect("create temp dir");
            TempDir(dir)
        }
        fn path(&self) -> &Path {
            &self.0
        }
        fn touch(&self, name: &str) {
            fs::write(self.0.join(name), b"{}").expect("write temp file");
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn is_auto_backup_file_name_accepts_only_the_app_namespace() {
        assert!(is_auto_backup_file_name(
            "daily-canvas-auto-backup-2026-09-23T10-00-00-000Z.json"
        ));
        assert!(!is_auto_backup_file_name("some-other-app-export.json"));
        assert!(!is_auto_backup_file_name("notes.json"));
        assert!(!is_auto_backup_file_name(
            "daily-canvas-auto-backup-2026-09-23T10-00-00-000Z.json.tmp"
        ));
    }

    #[test]
    fn scan_auto_backups_never_returns_a_non_namespaced_json_file() {
        let dir = TempDir::new("scan");
        dir.touch("daily-canvas-auto-backup-2026-09-20T00-00-00-000Z.json");
        dir.touch("daily-canvas-auto-backup-2026-09-21T00-00-00-000Z.json");
        // A sentinel that just happens to sit in the same directory but was never written by this
        // app's auto-backup feature.
        dir.touch("unrelated-third-party-file.json");

        let listed = scan_auto_backups(dir.path()).expect("scan succeeds");
        assert_eq!(listed.len(), 2);
        assert!(listed
            .iter()
            .all(|entry| is_auto_backup_file_name(&entry.file_name)));
        assert!(!listed
            .iter()
            .any(|entry| entry.file_name == "unrelated-third-party-file.json"));
    }

    #[test]
    fn a_non_namespaced_json_file_is_never_counted_toward_retention_or_pruned() {
        let dir = TempDir::new("retention");
        // More than RETAINED_BACKUPS (7) namespaced files, to exercise the same over-cap condition
        // the TypeScript retention policy prunes down from.
        for i in 0..9 {
            dir.touch(&format!(
                "daily-canvas-auto-backup-2026-09-{:02}T00-00-00-000Z.json",
                i + 1
            ));
        }
        dir.touch("sentinel-not-an-auto-backup.json");

        let listed = scan_auto_backups(dir.path()).expect("scan succeeds");
        // The sentinel must never be among the entries retention counts against the cap.
        assert_eq!(listed.len(), 9);
        assert!(!listed
            .iter()
            .any(|entry| entry.file_name == "sentinel-not-an-auto-backup.json"));
        // And the sentinel file itself is untouched on disk -- scanning is read-only.
        assert!(dir.path().join("sentinel-not-an-auto-backup.json").exists());
    }

    #[test]
    fn delete_auto_backup_refuses_a_file_name_outside_the_namespace() {
        assert!(!is_auto_backup_file_name("sentinel-not-an-auto-backup.json"));
        // `delete_auto_backup` itself requires a live AppHandle to resolve the backup directory,
        // so the namespace refusal -- its actual safety property -- is exercised directly here
        // rather than through the full Tauri command.
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
