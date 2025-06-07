import { useEffect, useRef, useState } from "react";
import "./Camera.css";

interface CameraProps {
  onError?: (error: string) => void;
}

export default function Camera({ onError }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false, // Just camera view, no audio for now
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      setStream(mediaStream);
      setFacingMode(facing);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      onError?.(errorMessage);
      console.error("Camera error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startCamera();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle visibility change (when app goes to background/foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background, pause video
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // App came to foreground, resume video
        if (videoRef.current && stream) {
          videoRef.current.play();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stream]);

  if (isLoading) {
    return (
      <div className="camera-container">
        <div className="camera-loading">
          <div className="loading-spinner"></div>
          <p>Starting camera...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="camera-container">
        <div className="camera-error">
          <div className="error-icon">📷</div>
          <h3>Camera Error</h3>
          <p>{error}</p>
          <button onClick={() => startCamera()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        className="camera-video"
        playsInline
        muted
        autoPlay
      />
    </div>
  );
}
