// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:worldforge.db", vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial_schema",
                    sql: include_str!("../migrations/001_initial.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }
            ])
            .build()
        )
        .run(context)
        .expect("error while running WorldForge");
}
