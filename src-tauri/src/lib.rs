//! Daily Canvas desktop shell.
//!
//! The shell only exposes narrow native adapters. Domain logic, storage
//! (Dexie/IndexedDB) and every product rule stay in the web application.

use serde::Serialize;
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            desktop_info,
            save_export,
            print_page,
            send_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running Daily Canvas");
}
