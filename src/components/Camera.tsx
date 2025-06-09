import { useEffect, useRef, useState, useCallback } from "react";
import "./Camera.css";

interface CameraProps {
  onError?: (error: string) => void;
}

interface VideoSegment {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: number;
}

const MAX_TOTAL_DURATION = 60000; // 60 seconds in milliseconds

export default function Camera({ onError }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  // Preview states
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // State change logging
  useEffect(() => {
    console.log("📊 [State] Recording state changed:", {
      isRecording,
      currentRecordingDuration,
      totalDuration,
      segmentCount: videoSegments.length,
      maxDuration: MAX_TOTAL_DURATION,
      remainingTime: MAX_TOTAL_DURATION - totalDuration - currentRecordingDuration
    });
  }, [isRecording, currentRecordingDuration, totalDuration, videoSegments.length]);

  useEffect(() => {
    console.log("📊 [State] Preview state changed:", {
      isPreviewMode,
      currentPreviewIndex,
      totalSegments: videoSegments.length
    });
  }, [isPreviewMode, currentPreviewIndex, videoSegments.length]);

  useEffect(() => {
    console.log("📊 [State] Camera state changed:", {
      facingMode,
      hasStream: !!stream,
      isLoading,
      error: error || 'none'
    });
  }, [facingMode, stream, isLoading, error]);

  // State change logging
  useEffect(() => {
    console.log("📊 [State] Recording state changed:", {
      isRecording,
      currentRecordingDuration,
      totalDuration,
      segmentCount: videoSegments.length,
      maxDuration: MAX_TOTAL_DURATION,
      remainingTime: MAX_TOTAL_DURATION - totalDuration - currentRecordingDuration
    });
  }, [isRecording, currentRecordingDuration, totalDuration, videoSegments.length]);

  useEffect(() => {
    console.log("📊 [State] Preview state changed:", {
      isPreviewMode,
      currentPreviewIndex,
      totalSegments: videoSegments.length
    });
  }, [isPreviewMode, currentPreviewIndex, videoSegments.length]);

  useEffect(() => {
    console.log("📊 [State] Camera state changed:", {
      facingMode,
      hasStream: !!stream,
      isLoading,
      error: error || 'none'
    });
  }, [facingMode, stream, isLoading, error]);

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    console.log(`🎥 [Camera] Starting camera with facing mode: ${facing}`);
    try {
      setIsLoading(true);
      setError(null);
      console.log("🎥 [Camera] Set loading state to true, cleared error state");

      // Stop existing stream if any
      if (stream) {
        console.log("🎥 [Camera] Stopping existing stream tracks");
        stream.getTracks().forEach((track, index) => {
          console.log(`🎥 [Camera] Stopping track ${index}: ${track.kind} (${track.label})`);
          track.stop();
        });
        
        // Clear video element source before stopping stream
        if (videoRef.current) {
          console.log("🎥 [Camera] Clearing video element source before restarting");
          videoRef.current.srcObject = null;
          videoRef.current.pause();
        }
        
        // Clear the stream from state
        setStream(null);
        console.log("🎥 [Camera] Cleared stream from state");
        
        // Add a small delay to ensure tracks are fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log("🎥 [Camera] Waited for stream cleanup to complete");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true, // Enable audio for video recording
      };
      console.log("🎥 [Camera] Media constraints:", JSON.stringify(constraints, null, 2));

      console.log("🎥 [Camera] Requesting user media access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("🎥 [Camera] Successfully obtained media stream");
      console.log(`🎥 [Camera] Stream tracks: ${mediaStream.getTracks().map(track => `${track.kind}(${track.label})`).join(', ')}`);

      // Verify we have at least one video track
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video tracks available in media stream");
      }
      console.log(`🎥 [Camera] Video track obtained: ${videoTracks[0].label}`);

      if (videoRef.current) {
        console.log("🎥 [Camera] Setting video element source and starting playback");
        
        // Ensure video element is properly reset
        const video = videoRef.current;
        video.srcObject = null;
        video.src = "";
        video.load(); // Force reset of video element
        
        // Small delay to ensure video element is reset
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now set the new stream
        video.srcObject = mediaStream;
        video.muted = true; // Ensure muted for camera feed
        
        // Create a promise that resolves when video is ready to play
        const videoReadyPromise = new Promise<void>((resolve, reject) => {
          if (!video) {
            reject(new Error("Video element not available"));
            return;
          }

          const onLoadedMetadata = () => {
            console.log("🎥 [Camera] Video metadata loaded");
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };

          const onError = (e: Event) => {
            console.error("🎥 [Camera] Video element error:", e);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error("Video element failed to load"));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Set a timeout to prevent hanging
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error("Video loading timeout"));
          }, 5000);
        });

        // Wait for video to be ready, then play
        await videoReadyPromise;
        
        console.log("🎥 [Camera] Starting video playback");
        const playPromise = video.play();
        await playPromise;
        console.log("🎥 [Camera] Video element playback started successfully");
      } else {
        console.warn("🎥 [Camera] Video ref is null, cannot set stream");
      }

      setStream(mediaStream);
      setFacingMode(facing);
      console.log(`🎥 [Camera] Camera successfully initialized with facing mode: ${facing}`);
    } catch (err) {
      let errorMessage = "Failed to access camera";
      
      if (err instanceof Error) {
        console.error("🎥 [Camera] Camera initialization failed:", err);
        
        // Handle specific error cases
        if (err.name === 'NotAllowedError') {
          errorMessage = "Camera permission denied. Please allow camera access and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No camera found. Please connect a camera and try again.";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "Camera is being used by another application. Please close other apps and try again.";
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = `Camera doesn't support ${facing} mode. Trying alternative...`;
          console.log("🎥 [Camera] Overconstrained error, attempting fallback");
          
          // Try with basic constraints as fallback
          try {
            const fallbackConstraints: MediaStreamConstraints = {
              video: true,
              audio: true,
            };
            console.log("🎥 [Camera] Attempting fallback with basic constraints");
            const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            
            if (videoRef.current) {
              const video = videoRef.current;
              video.srcObject = null;
              video.src = "";
              video.load();
              await new Promise(resolve => setTimeout(resolve, 50));
              video.srcObject = fallbackStream;
              video.muted = true;
              await video.play();
            }
            
            setStream(fallbackStream);
            setFacingMode(facing);
            console.log("🎥 [Camera] Fallback camera initialization successful");
            return; // Success with fallback
          } catch (fallbackErr) {
            console.error("🎥 [Camera] Fallback also failed:", fallbackErr);
            errorMessage = "Camera initialization failed. Please check your camera settings.";
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error("🎥 [Camera] Final error message:", errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      console.log("🎥 [Camera] Set loading state to false");
    }
  };

  const flipCamera = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    console.log(`🔄 [Camera] Flipping camera from ${facingMode} to ${newFacing}`);
    
    // Set loading state to show user something is happening
    setIsLoading(true);
    console.log("🔄 [Camera] Set loading state during flip");
    
    try {
      await startCamera(newFacing);
      console.log(`🔄 [Camera] Successfully flipped to ${newFacing} camera`);
    } catch (error) {
      console.error("🔄 [Camera] Failed to flip camera:", error);
      // Try to restart with original facing mode if flip fails
      console.log(`🔄 [Camera] Attempting to restore ${facingMode} camera after flip failure`);
      try {
        await startCamera(facingMode);
      } catch (restoreError) {
        console.error("🔄 [Camera] Failed to restore original camera:", restoreError);
        setError("Failed to switch camera");
      }
    }
  };

  const startRecording = useCallback(() => {
    console.log("🔴 [Recording] Start recording requested");
    console.log(`🔴 [Recording] Current state - isRecording: ${isRecording}, totalDuration: ${totalDuration}ms, maxDuration: ${MAX_TOTAL_DURATION}ms`);
    
    if (!stream) {
      console.error("🔴 [Recording] Cannot start recording - no stream available");
      return;
    }
    
    if (isRecording) {
      console.warn("🔴 [Recording] Already recording, ignoring start request");
      return;
    }
    
    if (totalDuration >= MAX_TOTAL_DURATION) {
      console.warn("🔴 [Recording] Cannot start recording - max duration reached");
      return;
    }

    try {
      console.log("🔴 [Recording] Creating MediaRecorder with stream");
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      console.log("🔴 [Recording] MediaRecorder created successfully");

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log(`🔴 [Recording] Data available - size: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log(`🔴 [Recording] Added chunk to array, total chunks: ${chunks.length}`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("🔴 [Recording] MediaRecorder stopped");
        const blob = new Blob(chunks, { type: 'video/webm' });
        const duration = Date.now() - recordingStartTimeRef.current;
        console.log(`🔴 [Recording] Created blob - size: ${blob.size} bytes, duration: ${duration}ms`);
        
        const segment: VideoSegment = {
          id: Date.now().toString(),
          blob,
          url: URL.createObjectURL(blob),
          duration,
          timestamp: Date.now(),
        };
        console.log(`🔴 [Recording] Created video segment:`, {
          id: segment.id,
          size: segment.blob.size,
          duration: segment.duration,
          url: segment.url
        });

        setVideoSegments(prev => {
          const newSegments = [...prev, segment];
          console.log(`🔴 [Recording] Updated segments array - total segments: ${newSegments.length}`);
          return newSegments;
        });
        
        setTotalDuration(prev => {
          const newTotal = prev + duration;
          console.log(`🔴 [Recording] Updated total duration: ${prev}ms -> ${newTotal}ms`);
          return newTotal;
        });
        
        setCurrentRecordingDuration(0);
        console.log("🔴 [Recording] Reset current recording duration to 0");
      };

      console.log("🔴 [Recording] Starting MediaRecorder");
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      console.log(`🔴 [Recording] Recording started at timestamp: ${recordingStartTimeRef.current}`);

      // Update recording duration
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        setCurrentRecordingDuration(elapsed);
        
        // Auto-stop if we reach max duration
        if (totalDuration + elapsed >= MAX_TOTAL_DURATION) {
          console.log(`🔴 [Recording] Auto-stopping - reached max duration (${totalDuration + elapsed}ms >= ${MAX_TOTAL_DURATION}ms)`);
          stopRecording();
        }
      }, 100);
      console.log("🔴 [Recording] Started duration tracking interval");

    } catch (err) {
      console.error("🔴 [Recording] Failed to start recording:", err);
      onError?.("Failed to start recording");
    }
  }, [stream, isRecording, totalDuration, onError]);

  const stopRecording = useCallback(() => {
    console.log("⏹ [Recording] Stop recording requested");
    console.log(`⏹ [Recording] Current state - isRecording: ${isRecording}, mediaRecorder exists: ${!!mediaRecorderRef.current}`);
    
    if (mediaRecorderRef.current && isRecording) {
      console.log("⏹ [Recording] Stopping MediaRecorder");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      console.log("⏹ [Recording] MediaRecorder stopped and cleared, isRecording set to false");
    } else {
      console.warn("⏹ [Recording] Stop recording called but not currently recording");
    }

    if (recordingIntervalRef.current) {
      console.log("⏹ [Recording] Clearing duration tracking interval");
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, [isRecording]);

  const deleteSegment = (segmentId: string) => {
    console.log(`🗑 [Segments] Delete segment requested - ID: ${segmentId}`);
    setVideoSegments(prev => {
      const segmentToDelete = prev.find(s => s.id === segmentId);
      if (segmentToDelete) {
        console.log(`🗑 [Segments] Found segment to delete:`, {
          id: segmentToDelete.id,
          duration: segmentToDelete.duration,
          size: segmentToDelete.blob.size,
          url: segmentToDelete.url
        });
        URL.revokeObjectURL(segmentToDelete.url);
        console.log(`🗑 [Segments] Revoked object URL: ${segmentToDelete.url}`);
        
        setTotalDuration(total => {
          const newTotal = total - segmentToDelete.duration;
          console.log(`🗑 [Segments] Updated total duration: ${total}ms -> ${newTotal}ms`);
          return newTotal;
        });
      } else {
        console.warn(`🗑 [Segments] Segment with ID ${segmentId} not found`);
      }
      
      const filteredSegments = prev.filter(s => s.id !== segmentId);
      console.log(`🗑 [Segments] Segments after deletion: ${filteredSegments.length} remaining`);
      return filteredSegments;
    });
  };

  const enterPreviewMode = () => {
    console.log("▶️ [Preview] Enter preview mode requested");
    console.log(`▶️ [Preview] Available segments: ${videoSegments.length}`);
    
    if (videoSegments.length === 0) {
      console.warn("▶️ [Preview] Cannot enter preview mode - no segments available");
      return;
    }
    
    // Stop the camera stream when entering preview mode
    if (stream) {
      console.log("▶️ [Preview] Stopping camera stream for preview mode");
      stream.getTracks().forEach((track) => {
        console.log(`▶️ [Preview] Stopping track: ${track.kind} (${track.label})`);
        track.stop();
      });
      
      // Clear the video element source completely
      if (videoRef.current) {
        console.log("▶️ [Preview] Clearing camera video element");
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
        videoRef.current.pause();
        videoRef.current.load(); // Force reset
        console.log("▶️ [Preview] Cleared and paused camera video element");
      }
      
      // Clear stream from state
      setStream(null);
      console.log("▶️ [Preview] Cleared stream from state");
    }
    
    console.log("▶️ [Preview] Entering preview mode, setting currentPreviewIndex to 0");
    setIsPreviewMode(true);
    setCurrentPreviewIndex(0);
  };

  const exitPreviewMode = async () => {
    console.log("⬅️ [Preview] Exit preview mode requested");
    
    // Stop the preview video if it's playing
    if (previewVideoRef.current) {
      console.log("⬅️ [Preview] Cleaning up preview video");
      previewVideoRef.current.pause();
      previewVideoRef.current.src = "";
      previewVideoRef.current.srcObject = null;
      previewVideoRef.current.load(); // Force reload to clear the source
      console.log("⬅️ [Preview] Stopped and cleared preview video");
    }
    
    // First set preview mode to false to update UI
    setIsPreviewMode(false);
    setCurrentPreviewIndex(0);
    console.log("⬅️ [Preview] Exited preview mode, reset currentPreviewIndex to 0");
    
    // Add a small delay to ensure UI state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restart the camera when exiting preview mode
    console.log("⬅️ [Preview] Restarting camera after preview exit");
    await startCamera(facingMode);
  };

  const playNextSegment = () => {
    console.log(`⏭ [Preview] Play next segment - current index: ${currentPreviewIndex}, total segments: ${videoSegments.length}`);
    
    if (currentPreviewIndex < videoSegments.length - 1) {
      const nextIndex = currentPreviewIndex + 1;
      console.log(`⏭ [Preview] Moving to next segment: ${nextIndex}`);
      setCurrentPreviewIndex(nextIndex);
    } else {
      // Loop back to first segment
      console.log("⏭ [Preview] Reached end, looping back to first segment");
      setCurrentPreviewIndex(0);
    }
  };

  // Handle video segment playback in preview mode
  useEffect(() => {
    if (isPreviewMode && previewVideoRef.current && videoSegments[currentPreviewIndex]) {
      const video = previewVideoRef.current;
      const segment = videoSegments[currentPreviewIndex];
      
      console.log(`📹 [Preview] Setting up segment playback:`, {
        segmentIndex: currentPreviewIndex,
        segmentId: segment.id,
        duration: segment.duration,
        url: segment.url
      });
      
      // Clear any existing source first
      video.src = "";
      video.load();
      
      // Set new source and play
      video.src = segment.url;
      video.currentTime = 0;
      
      const playPromise = video.play();
      console.log("📹 [Preview] Started video.play()");
      
      playPromise.then(() => {
        console.log(`📹 [Preview] Successfully started playing segment ${currentPreviewIndex + 1}/${videoSegments.length}`);
      }).catch(err => {
        console.error("📹 [Preview] Failed to play segment:", err);
      });

      const handleEnded = () => {
        console.log(`📹 [Preview] Segment ${currentPreviewIndex + 1} finished playing`);
        playNextSegment();
      };

      const handleError = (e: Event) => {
        console.error("📹 [Preview] Video playback error:", e);
      };

      const handleLoadStart = () => {
        console.log(`📹 [Preview] Started loading segment ${currentPreviewIndex + 1}`);
      };

      const handleCanPlay = () => {
        console.log(`📹 [Preview] Segment ${currentPreviewIndex + 1} ready to play`);
      };

      const handleTimeUpdate = () => {
        // Optional: Log playback progress
        const progress = (video.currentTime / video.duration) * 100;
        if (progress % 25 < 1) { // Log every 25%
          console.log(`📹 [Preview] Segment ${currentPreviewIndex + 1} progress: ${progress.toFixed(1)}%`);
        }
      };

      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        console.log(`📹 [Preview] Cleaning up event listeners for segment ${currentPreviewIndex + 1}`);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [isPreviewMode, currentPreviewIndex, videoSegments]);

  // Stop recording when entering preview mode
  useEffect(() => {
    if (isPreviewMode && isRecording) {
      console.log("▶️ [Preview] Stopping recording because preview mode was entered");
      stopRecording();
    }
  }, [isPreviewMode, isRecording, stopRecording]);

  // Handle touch/mouse events for hold-to-record
  const handleRecordStart = (e: React.TouchEvent | React.MouseEvent) => {
    console.log("👆 [Input] Record start event triggered");
    console.log(`👆 [Input] Event type: ${e.type}`);
    e.preventDefault();
    startRecording();
  };

  const handleRecordEnd = (e: React.TouchEvent | React.MouseEvent) => {
    console.log("👆 [Input] Record end event triggered");
    console.log(`👆 [Input] Event type: ${e.type}`);
    e.preventDefault();
    stopRecording();
  };

  useEffect(() => {
    console.log("🚀 [Lifecycle] Camera component mounting, initializing camera");
    startCamera();

    return () => {
      console.log("🧹 [Lifecycle] Camera component unmounting, cleaning up resources");
      
      if (stream) {
        console.log("🧹 [Lifecycle] Stopping stream tracks");
        stream.getTracks().forEach((track, index) => {
          console.log(`🧹 [Lifecycle] Stopping track ${index}: ${track.kind} (${track.label})`);
          track.stop();
        });
      }
      
      // Cleanup video URLs
      console.log(`🧹 [Lifecycle] Cleaning up ${videoSegments.length} video segment URLs`);
      videoSegments.forEach((segment, index) => {
        console.log(`🧹 [Lifecycle] Revoking URL for segment ${index + 1}: ${segment.url}`);
        URL.revokeObjectURL(segment.url);
      });
      
      if (recordingIntervalRef.current) {
        console.log("🧹 [Lifecycle] Clearing recording interval");
        clearInterval(recordingIntervalRef.current);
      }
      
      console.log("🧹 [Lifecycle] Cleanup completed");
    };
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log(`👁 [Visibility] Page visibility changed - hidden: ${document.hidden}`);
      
      if (document.hidden) {
        console.log("👁 [Visibility] Page became hidden, pausing video and stopping recording if active");
        
        if (videoRef.current) {
          console.log("👁 [Visibility] Pausing camera video");
          videoRef.current.pause();
        }
        
        if (isRecording) {
          console.log("👁 [Visibility] Stopping active recording due to visibility change");
          stopRecording();
        }
      } else {
        console.log("👁 [Visibility] Page became visible, resuming video playback");
        
        if (videoRef.current && stream) {
          console.log("👁 [Visibility] Resuming camera video playback");
          const playPromise = videoRef.current.play();
          playPromise.catch(err => {
            console.error("👁 [Visibility] Failed to resume video playback:", err);
          });
        }
      }
    };

    console.log("👁 [Visibility] Setting up visibility change listener");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      console.log("👁 [Visibility] Removing visibility change listener");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stream, isRecording, stopRecording]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getRemainingTime = () => {
    const remaining = MAX_TOTAL_DURATION - totalDuration - currentRecordingDuration;
    const remainingTime = Math.max(0, remaining);
    console.log(`⏱ [Duration] Remaining time calculated: ${remainingTime}ms (total: ${totalDuration}ms, current: ${currentRecordingDuration}ms, max: ${MAX_TOTAL_DURATION}ms)`);
    return remainingTime;
  };

  if (isLoading) {
    console.log("⏳ [UI] Rendering loading state");
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
    console.log(`❌ [UI] Rendering error state: ${error}`);
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

  if (isPreviewMode) {
    console.log(`▶️ [UI] Rendering preview mode - segment ${currentPreviewIndex + 1}/${videoSegments.length}`);
    return (
      <div className="camera-container preview-mode">
        <video
          ref={previewVideoRef}
          className="preview-video"
          playsInline
          autoPlay
          muted={false}
        />
        
        <div className="preview-controls">
          <button onClick={exitPreviewMode} className="preview-exit-btn">
            ← Back to Camera
          </button>
          
          <div className="preview-info">
            <span className="preview-counter">
              {currentPreviewIndex + 1} / {videoSegments.length}
            </span>
          </div>
        </div>

        <div className="preview-segments-bar">
          {videoSegments.map((segment, index) => (
            <div
              key={segment.id}
              className={`preview-segment-indicator ${
                index === currentPreviewIndex ? 'active' : ''
              }`}
              style={{ width: `${(segment.duration / totalDuration) * 100}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  console.log("🎬 [UI] Rendering main camera interface");
  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        className="camera-video"
        playsInline
        muted
        autoPlay
      />
      
      {/* Camera Controls Overlay */}
      <div className="camera-overlay">
        {/* Top Controls */}
        <div className="top-controls">
          <button onClick={flipCamera} className="flip-camera-button">
            🔄
          </button>
          
          <div className="recording-info">
            <div className="total-duration">
              {formatDuration(totalDuration)} / {formatDuration(MAX_TOTAL_DURATION)}
            </div>
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                REC {formatDuration(currentRecordingDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Segments Display */}
        {videoSegments.length > 0 && (
          <div className="segments-container">
            <div className="segments-progress-bar">
              {videoSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="segment-progress"
                  style={{ width: `${(segment.duration / MAX_TOTAL_DURATION) * 100}%` }}
                />
              ))}
              {isRecording && (
                <div
                  className="segment-progress recording"
                  style={{ width: `${(currentRecordingDuration / MAX_TOTAL_DURATION) * 100}%` }}
                />
              )}
            </div>
            
            <div className="segments-list">
              {videoSegments.map((segment, index) => (
                <div key={segment.id} className="segment-item">
                  <span className="segment-number">{index + 1}</span>
                  <span className="segment-duration">{formatDuration(segment.duration)}</span>
                  <button
                    onClick={() => deleteSegment(segment.id)}
                    className="delete-segment-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="bottom-controls">
          {videoSegments.length > 0 && (
            <button onClick={enterPreviewMode} className="preview-button">
              ▶ Preview ({videoSegments.length})
            </button>
          )}
          
          <button
            className={`record-button ${isRecording ? 'recording' : ''} ${
              totalDuration >= MAX_TOTAL_DURATION ? 'disabled' : ''
            }`}
            onTouchStart={handleRecordStart}
            onTouchEnd={handleRecordEnd}
            onMouseDown={handleRecordStart}
            onMouseUp={handleRecordEnd}
            onMouseLeave={handleRecordEnd}
            disabled={totalDuration >= MAX_TOTAL_DURATION}
          >
            <div className="record-button-inner">
              {isRecording ? '⏹' : '⏺'}
            </div>
            <div className="record-button-text">
              {totalDuration >= MAX_TOTAL_DURATION
                ? 'Max Duration Reached'
                : isRecording
                ? 'Release to Stop'
                : 'Hold to Record'
              }
            </div>
          </button>

          {videoSegments.length > 0 && (
            <div className="remaining-time">
              {formatDuration(getRemainingTime())} left
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
