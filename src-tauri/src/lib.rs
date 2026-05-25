use std::path::PathBuf;
use std::process::Command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Spawn the Bambu bridge as a background process
            spawn_bambu_bridge();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn spawn_bambu_bridge() {
    // Find the bridge script — check multiple locations
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let bridge_paths = vec![
        // Installed app: resources bundled next to exe
        exe_dir.join("resources").join("bambu-bridge").join("bridge.js"),
        // Dev mode: project root
        PathBuf::from("bambu-bridge").join("bridge.js"),
        // Relative to exe going up (common in dev)
        exe_dir.join("..").join("..").join("..").join("bambu-bridge").join("bridge.js"),
    ];

    let bridge_path = bridge_paths.iter().find(|p| p.exists()).cloned();

    match bridge_path {
        Some(path) => {
            let bridge_dir = path.parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| PathBuf::from("."));

            log::info!("Starting Bambu bridge from: {:?}", path);

            match Command::new("node")
                .arg(&path)
                .current_dir(&bridge_dir)
                // Detach from console window so it runs silently in background
                .spawn()
            {
                Ok(_) => log::info!("Bambu bridge started successfully"),
                Err(e) => log::warn!("Could not start Bambu bridge: {}. Live printer status unavailable.", e),
            }
        }
        None => {
            log::warn!("Bambu bridge script not found. Live printer status unavailable.");
        }
    }
}