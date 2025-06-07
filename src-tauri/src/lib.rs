// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn check_and_request_permissions() -> bool {
    #[cfg(target_os = "android")]
    {
        use jni::JNIEnv;
        use jni::objects::JObject;
        use tauri::android::{activity, jni};

        let env = jni().unwrap();
        let activity = activity().unwrap();

        let context = JObject::from(activity);

        // Define permissions
        let perms = vec![
            env.new_string("android.permission.CAMERA").unwrap(),
            env.new_string("android.permission.RECORD_AUDIO").unwrap(),
        ];

        for perm in perms {
            let res = env
                .call_static_method(
                    "androidx/core/content/ContextCompat",
                    "checkSelfPermission",
                    "(Landroid/content/Context;Ljava/lang/String;)I",
                    &[context.into(), perm.into()],
                )
                .unwrap()
                .i()
                .unwrap();

            if res != 0 {
                // NOT_GRANTED
                return false;
            }
        }
        true
    }

    #[cfg(target_os = "ios")]
    {
        // Tauri doesn't yet support native iOS permission prompts via Rust
        // iOS shows prompt when you use the camera the first time
        true
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        true
    }
}



#[tauri::command]
fn get_platform() -> String {
    #[cfg(target_os = "android")]
    return "android".to_string();
    
    #[cfg(target_os = "ios")]
    return "ios".to_string();
    
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    
    #[cfg(not(any(target_os = "android", target_os = "ios", target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "unknown".to_string();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet , check_and_request_permissions, get_platform])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


