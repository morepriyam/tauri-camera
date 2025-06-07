import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Onboarding.css"; // Optional CSS

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(
    null
  );
  const [platform, setPlatform] = useState<string>("");

  const checkPermissions = async () => {
    try {
      const result = await invoke<boolean>("check_and_request_permissions");
      setPermissionsGranted(result);
    } catch (err) {
      console.error("Permission check failed:", err);
      setPermissionsGranted(false);
    }
  };

  useEffect(() => {
    // Get platform from Rust backend for accurate detection
    const initPlatform = async () => {
      try {
        const platformResult = await invoke<string>("get_platform");
        setPlatform(platformResult);
      } catch (err) {
        // Fallback to browser detection
        const userAgent = navigator.userAgent;
        if (/iPhone|iPad|iPod/i.test(userAgent)) {
          setPlatform("ios");
        } else if (/Android/i.test(userAgent)) {
          setPlatform("android");
        } else {
          setPlatform("desktop");
        }
      }
    };

    initPlatform();
    checkPermissions();
  }, []);

  const handleRetry = () => {
    checkPermissions();
  };

  const handleContinue = () => {
    if (platform === "ios") {
      // On iOS, we continue and let the camera access trigger native permission prompts
      onDone();
    } else {
      onDone();
    }
  };

  if (permissionsGranted === null) {
    return <div className="onboarding-screen">Checking permissions...</div>;
  }

  const renderInstructions = () => {
    switch (platform) {
      case "ios":
        return (
          <div className="instructions">
            <h2>📱 iOS Instructions</h2>
            <p>When you start recording, iOS will ask for permissions:</p>
            <ol>
              <li>
                📷 <strong>Camera Access:</strong> Tap "OK" to allow camera
                usage
              </li>
              <li>
                🎤 <strong>Microphone Access:</strong> Tap "OK" to allow audio
                recording
              </li>
              <li>
                📁 <strong>Photo Library:</strong> Tap "OK" to save your videos
              </li>
            </ol>
            <p className="note">
              💡 If you accidentally tap "Don't Allow", go to Settings → Privacy
              & Security → Camera/Microphone to enable permissions.
            </p>
          </div>
        );
      case "android":
        return (
          <div className="instructions">
            <h2>🤖 Android Instructions</h2>
            <p>Grant the following permissions to use the app:</p>
            <ul>
              <li>📷 Camera - for recording videos</li>
              <li>🎤 Microphone - for recording audio</li>
              <li>📁 Storage - for saving videos</li>
            </ul>
          </div>
        );
      default:
        return (
          <div className="instructions">
            <h2>💻 Desktop Instructions</h2>
            <p>
              Your browser will ask for camera and microphone access when you
              start recording.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="onboarding-screen">
      <h1>Welcome to MIE Shorts</h1>
      <p>Record and share short videos with hold-to-record functionality!</p>

      {renderInstructions()}

      <div className="features">
        <h3>✨ How to Use:</h3>
        <ul>
          <li>
            🎬 <strong>Hold to Record:</strong> Press and hold the record button
          </li>
          <li>
            🔄 <strong>Flip Camera:</strong> Switch between front and back
            cameras
          </li>
          <li>
            ⏱️ <strong>Segments:</strong> Record multiple clips up to 1 minute
            total
          </li>
          <li>
            📤 <strong>Upload:</strong> Share your videos with the MIE community
          </li>
        </ul>
      </div>

      {permissionsGranted || platform === "ios" ? (
        <button className="continue-button" onClick={handleContinue}>
          {platform === "ios"
            ? "Start Recording (Permissions will be requested)"
            : "Continue"}
        </button>
      ) : (
        <>
          <p className="error-text">
            {platform === "android"
              ? "Please grant camera and microphone permissions to continue."
              : "Permissions not granted."}
          </p>
          <button className="retry-button" onClick={handleRetry}>
            Check Permissions Again
          </button>
        </>
      )}
    </div>
  );
}
