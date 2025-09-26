"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Square,
  Download,
  Upload,
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordedBlob: Blob | null;
  recordingTime: number;
  stream: MediaStream | null;
}

interface BrowserSupport {
  isSupported: boolean;
  missingFeatures: string[];
  browser: string;
}

export function ScreenRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordedBlob: null,
    recordingTime: 0,
    stream: null,
  });

  const [micEnabled, setMicEnabled] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check browser compatibility on mount
  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = () => {
    const missingFeatures: string[] = [];
    let browser = "Unknown";

    // Detect browser
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    // Check required APIs
    if (!navigator.mediaDevices?.getDisplayMedia) {
      missingFeatures.push("Screen Capture API");
    }
    if (!window.MediaRecorder) {
      missingFeatures.push("MediaRecorder API");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      missingFeatures.push("Microphone Access");
    }

    setBrowserSupport({
      isSupported: missingFeatures.length === 0,
      missingFeatures,
      browser,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.recordingTime >= 180) {
          // 3 minutes limit
          stopRecording();
          return prev;
        }
        return { ...prev, recordingTime: prev.recordingTime + 1 };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);

      // Request screen capture with better options
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      let finalStream = displayStream;

      // Add microphone audio if enabled
      if (micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
            },
            video: false,
          });

          // Create audio context for mixing
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          const destination = audioContext.createMediaStreamDestination();

          // Mix system audio and microphone
          if (displayStream.getAudioTracks().length > 0) {
            const displayAudio =
              audioContext.createMediaStreamSource(displayStream);
            const displayGain = audioContext.createGain();
            displayGain.gain.value = 0.7; // Reduce system audio slightly
            displayAudio.connect(displayGain);
            displayGain.connect(destination);
          }

          const micAudio = audioContext.createMediaStreamSource(audioStream);
          const micGain = audioContext.createGain();
          micGain.gain.value = 1.0; // Keep mic at full volume
          micAudio.connect(micGain);
          micGain.connect(destination);

          // Combine video from display with mixed audio
          const videoTrack = displayStream.getVideoTracks()[0];
          const audioTrack = destination.stream.getAudioTracks()[0];

          finalStream = new MediaStream([videoTrack, audioTrack]);
        } catch (micError) {
          console.warn(
            "Microphone access denied, recording without mic:",
            micError
          );
          setError("Microphone access denied. Recording system audio only.");
        }
      }

      // Determine best codec
      let mimeType = "video/webm;codecs=vp9,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }
      }

      console.log("Selected MIME type:", mimeType);
      console.log("MediaRecorder supported types check:", {
        vp9opus: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus"),
        vp8opus: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus"),
        webm: MediaRecorder.isTypeSupported("video/webm"),
      });

      // Set up MediaRecorder with better options
      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000, // 128 kbps
      });

      console.log("MediaRecorder created with state:", mediaRecorder.state);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available:", {
          size: event.data.size,
          type: event.data.type,
        });
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("Total chunks collected:", chunksRef.current.length);
        } else {
          console.warn("Empty data chunk received");
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, chunks:", chunksRef.current.length);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("Created blob:", { size: blob.size, type: blob.type });

        setState((prev) => ({
          ...prev,
          recordedBlob: blob,
          isRecording: false,
        }));

        // Clean up previous video URL
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }

        // Show preview with better handling
        if (blob.size > 0) {
          console.log("Blob has data, attempting to create preview");

          // Use setTimeout to ensure the component has re-rendered and video element is available
          setTimeout(() => {
            if (videoRef.current) {
              console.log("Video element is available");

              try {
                const newVideoUrl = URL.createObjectURL(blob);
                console.log("Created blob URL:", newVideoUrl);

                setVideoUrl(newVideoUrl);
                videoRef.current.src = newVideoUrl;

                // Ensure video loads and can play
                videoRef.current.load();

                // Set up event listeners with better error handling
                const handleLoadedData = () => {
                  console.log("Video preview loaded successfully");
                  setError(null); // Clear any previous errors
                };

                const handleError = (e: Event) => {
                  console.error("Video preview error:", e);
                  const target = e.target as HTMLVideoElement;
                  console.error("Video error details:", {
                    error: target.error,
                    networkState: target.networkState,
                    readyState: target.readyState,
                    src: target.src,
                  });
                  setError(
                    "Failed to load video preview. You can still download or upload the recording."
                  );
                };

                videoRef.current.addEventListener(
                  "loadeddata",
                  handleLoadedData,
                  { once: true }
                );
                videoRef.current.addEventListener("error", handleError, {
                  once: true,
                });
              } catch (urlError) {
                console.error("Error creating blob URL:", urlError);
                setError(
                  "Failed to create preview URL. You can still download or upload the recording."
                );
              }
            } else {
              console.warn(
                "Video element still not found after timeout, trying again..."
              );
              // Retry after a longer delay
              setTimeout(() => {
                if (videoRef.current) {
                  console.log("Video element found on retry");
                  try {
                    const newVideoUrl = URL.createObjectURL(blob);
                    setVideoUrl(newVideoUrl);
                    videoRef.current.src = newVideoUrl;
                    videoRef.current.load();
                    setError(null); // Clear error since we found the video element
                  } catch (retryError) {
                    console.error("Retry failed:", retryError);
                    setError(
                      "Recording completed but preview is not available. You can still download the file."
                    );
                  }
                } else {
                  console.error("Video element not available even after retry");
                  setError(
                    "Recording completed but preview is not available. You can still download the file."
                  );
                }
              }, 500); // Longer delay for retry
            }
          }, 100); // Small delay to allow component re-render
        } else {
          console.warn("Blob is empty - no video data recorded");
          setError(
            "Recording completed but no data was captured. Please try again."
          );
        }

        stopTimer();

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try again.");
        stopRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setState((prev) => ({
        ...prev,
        isRecording: true,
        recordingTime: 0,
        stream: finalStream,
        recordedBlob: null,
      }));

      startTimer();

      // Handle stream end (user stops sharing)
      finalStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Handle tab visibility change
      const handleVisibilityChange = () => {
        if (document.hidden && state.isRecording) {
          console.log("Tab became hidden during recording");
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
    } catch (error) {
      console.error("Error starting recording:", error);
      let errorMessage = "Failed to start recording. ";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage += "Please grant screen sharing permissions.";
        } else if (error.name === "NotFoundError") {
          errorMessage += "No screen sharing source available.";
        } else if (error.name === "NotSupportedError") {
          errorMessage += "Screen recording is not supported in this browser.";
        } else {
          errorMessage += error.message;
        }
      }

      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      // Stop all tracks
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }

      setState((prev) => ({ ...prev, stream: null }));
      stopTimer();

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const downloadRecording = () => {
    if (state.recordedBlob) {
      const url = URL.createObjectURL(state.recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screen-recording-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const uploadRecording = async () => {
    if (!state.recordedBlob) return;

    setUploadStatus("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append(
        "recording",
        state.recordedBlob,
        `recording-${Date.now()}.webm`
      );
      formData.append(
        "title",
        `Screen Recording ${new Date().toLocaleString()}`
      );
      formData.append("duration", state.recordingTime.toString());
      formData.append("size", state.recordedBlob.size.toString());

      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("success");
        // Reset recording state and clean up video URL
        setState((prev) => ({ ...prev, recordedBlob: null, recordingTime: 0 }));
        if (videoRef.current) {
          videoRef.current.src = "";
        }
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
          setVideoUrl(null);
        }

        // Trigger recordings list refresh
        window.dispatchEvent(new CustomEvent("recordingUploaded"));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again."
      );
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Clean up blob URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!browserSupport) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Checking browser compatibility...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!browserSupport.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Browser Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your browser ({browserSupport.browser}) is missing required
              features for screen recording:
              <ul className="list-disc list-inside mt-2">
                {browserSupport.missingFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            For the best experience, please use Chrome, Firefox, or Edge with
            the latest updates.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Browser Info */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          {browserSupport.browser} browser detected. Screen recording is fully
          supported.
        </AlertDescription>
      </Alert>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Screen Recording</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMicEnabled(!micEnabled)}
                className={
                  micEnabled ? "text-primary" : "text-muted-foreground"
                }
                disabled={state.isRecording}
              >
                {micEnabled ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
                {micEnabled ? "Mic On" : "Mic Off"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            {!state.isRecording ? (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            )}
          </div>

          {state.isRecording && (
            <div className="text-center space-y-2">
              <div className="text-2xl font-mono font-bold text-primary animate-pulse">
                {formatTime(state.recordingTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                Recording... (Max 3 minutes) •{" "}
                {micEnabled ? "System + Mic Audio" : "System Audio Only"}
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(state.recordingTime / 180) * 100}%` }}
                />
              </div>
              {state.recordingTime >= 150 && (
                <div className="text-sm text-yellow-400">
                  Warning: Approaching 3-minute limit
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview & Actions */}
      {state.recordedBlob && (
        <Card>
          <CardHeader>
            <CardTitle>Recording Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                controls
                className="w-full max-w-2xl mx-auto rounded-lg bg-black"
                style={{ aspectRatio: "16/9" }}
                preload="metadata"
                playsInline
                muted={false}
                onLoadStart={() => {
                  console.log("Video load started");
                  setError(null); // Clear error when starting to load
                }}
                onLoadedMetadata={() => {
                  console.log("Video metadata loaded", {
                    duration: videoRef.current?.duration,
                    videoWidth: videoRef.current?.videoWidth,
                    videoHeight: videoRef.current?.videoHeight,
                  });
                }}
                onCanPlay={() => {
                  console.log("Video can play");
                  setError(null); // Clear error when video can play
                }}
                onError={(e) => {
                  console.error("Video element error:", e);
                  const target = e.target as HTMLVideoElement;
                  console.error("Video error details:", {
                    error: target.error,
                    code: target.error?.code,
                    message: target.error?.message,
                  });
                  setError(
                    "Preview not available, but recording was successful. You can download or upload the file."
                  );
                }}
              />

              {/* Fallback message if video fails to load */}
              {error && error.includes("Preview not available") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <div className="text-center text-white p-4">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Video preview failed to load</p>
                    <p className="text-xs text-gray-300">
                      Recording was successful - try downloading
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Duration: {formatTime(state.recordingTime)} • Size:{" "}
              {(state.recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={downloadRecording}
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>

              <Button
                onClick={uploadRecording}
                disabled={uploadStatus === "uploading"}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadStatus === "uploading"
                  ? "Uploading..."
                  : "Upload to Server"}
              </Button>
            </div>

            {uploadStatus === "success" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Recording uploaded successfully!
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === "error" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Upload failed. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
