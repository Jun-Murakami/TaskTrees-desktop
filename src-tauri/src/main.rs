// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};
use serde_json::json;
use std::path::PathBuf;
use dirs::config_dir;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
          let app_handle = app.app_handle();
          let config_dir = config_dir().unwrap();
          let path_dir = PathBuf::from(config_dir).join("TaskTrees");
          if !path_dir.exists() {
              if let Err(e) = std::fs::create_dir_all(&path_dir) {
                  println!("Failed to create directory: {:?}", e);
              }
          }
          let path = path_dir.join("window_state.json");
          if let Ok(contents) = std::fs::read_to_string(&path) {
              if let Ok(window_state) = serde_json::from_str::<serde_json::Value>(&contents) {
                  let width = window_state["width"].as_u64().unwrap_or(800) as f64;
                  let height = window_state["height"].as_u64().unwrap_or(600) as f64;
                  let x = window_state["x"].as_i64().unwrap_or(0) as i32;
                  let y = window_state["y"].as_i64().unwrap_or(0) as i32;
                  let is_maximized = window_state["is_maximized"].as_bool().unwrap_or(false);

                  let window = app_handle.get_window("main").unwrap();
                  window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: width as u32, height: height as u32 })).unwrap();
                  window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 })).unwrap();
                  if is_maximized {
                      window.maximize().unwrap();
                  }
              }
          }
            let window = app_handle.get_window("main").unwrap();
            let path_clone = path.clone();
            let window_clone = window.clone();
            window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                      api.prevent_close();
                      let is_maximized = window_clone.is_maximized().unwrap();
                      window_clone.unmaximize().unwrap();
                      let size = window_clone.outer_size().unwrap();
                      let position = window_clone.outer_position().unwrap();

                      let window_state = json!({
                          "width": size.width,
                          "height": size.height,
                          "x": position.x,
                          "y": position.y,
                          "is_maximized": is_maximized,
                      });

                      if let Err(e) = std::fs::write(&path_clone, serde_json::to_string(&window_state).unwrap()) {
                          println!("Error saving window state: {:?}", e);
                      }
                      app_handle.exit(0); 
                  },
                  _ => {}
              });
          
          Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
