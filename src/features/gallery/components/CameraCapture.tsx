import * as React from "react";
import { Camera, RefreshCw, Check, AlertCircle, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [capturedFile, setCapturedFile] = React.useState<File | null>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);


  // Helper to resolve user-friendly error messages based on WebRTC exceptions
  const getCameraErrorMessage = (err: any): string => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      return "Your browser does not support camera access.";
    }
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Camera permission denied.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "Camera device not found.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Camera is already being used by another application.";
    }
    if (name === "TypeError") {
      return "Browser does not support camera access.";
    }
    return err?.message || "Could not access camera. Please check permissions.";
  };

  // Asynchronous camera stream acquisition with cascading fallback
  const startCamera = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setHasPermission(null);
    setIsVideoPlaying(false);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      const errMsg = "Your browser does not support camera access.";
      setErrorMessage(errMsg);
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    let mediaStream: MediaStream | null = null;
    let lastError: any = null;

    // Retry configuration chain matching spec requirement
    try {
      console.log("[CameraCapture] Attempting config: facingMode user");
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
    } catch (error) {
      console.warn("[CameraCapture] facingMode user failed, retrying generic video: true", error);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }

    if (mediaStream) {
      // Required debugging logs
      console.log("Stream:", mediaStream);
      console.log("Tracks:", mediaStream.getVideoTracks());
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          // Await metadata load
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => resolve();
            } else {
              resolve();
            }
          });
          // Play stream
          await videoRef.current.play();
          setIsVideoPlaying(true);
        } catch (playErr) {
          console.error("Camera play error on stream init:", playErr);
          setIsVideoPlaying(false);
        }

        // Mobile Chrome specific fix
        setTimeout(async () => {
          if (videoRef.current && videoRef.current.paused) {
            try {
              await videoRef.current.play();
              setIsVideoPlaying(true);
              console.log("Mobile Chrome fallback play succeeded");
            } catch (fallbackErr) {
              console.error("Mobile Chrome fallback play failed:", fallbackErr);
              setIsVideoPlaying(false);
            }
          }
        }, 300);
      }
      setIsLoading(false);
    } else {
      console.error("Camera error:", lastError);
      const errMsg = getCameraErrorMessage(lastError);
      setErrorMessage(errMsg);
      setHasPermission(false);
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    startCamera();

    // Cleanup tracks on component unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Make canvas square matching ideal user selfie layout
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    // Crop center square
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(
      video,
      startX,
      startY,
      size,
      size,
      0,
      0,
      size,
      size
    );

    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImage(dataUrl);

    // Convert data url to File object
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturedFile(file);
      }
    }, "image/jpeg", 0.90);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error("Error playing retake video:", err));
    }
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  };

  const handleCancel = () => {
    onCancel();
  };


  return (
    <div className="space-y-4 w-full max-w-[280px] sm:max-w-sm mx-auto">
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-inner flex items-center justify-center">
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-zinc-400 p-4 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[11px] font-bold">Starting camera...</span>
          </div>
        )}

        {hasPermission === false && (
          <div className="flex flex-col items-center gap-2 p-5 text-center text-red-500">
            <CameraOff className="h-8 w-8 text-red-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Camera Access Failed</span>
            <p className="text-[10px] text-zinc-400 font-medium max-w-[220px] mt-1 leading-normal">
              {errorMessage || "Could not access camera. Please check permissions."}
            </p>
            <Button
              type="button"
              onClick={startCamera}
              variant="outline"
              className="mt-3 text-[10px] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300"
            >
              <RefreshCw className="h-3 w-3" />
              Retry Camera
            </Button>
          </div>
        )}

        {/* Live video viewfinder */}
        {!capturedImage && hasPermission && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]" // mirror effect
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 1, visibility: "visible", zIndex: 1 }}
          />
        )}

        {/* Camera initialized but preview failed fallback overlay */}
        {!capturedImage && hasPermission && stream && !isVideoPlaying && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-zinc-950 text-yellow-500 z-10 font-sans">
            <AlertCircle className="h-7 w-7 text-yellow-500 mb-2 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wide">Preview Suspension</span>
            <p className="text-[10px] text-zinc-400 mt-1.5 max-w-[200px] leading-normal font-medium">
              Camera initialized but preview failed. Click below to start the feed.
            </p>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await videoRef.current?.play();
                  setIsVideoPlaying(true);
                } catch (err) {
                  console.error("Manual play start failed:", err);
                }
              }}
              variant="outline"
              className="mt-3.5 text-[10px] border-yellow-500/25 text-yellow-500 hover:bg-yellow-500/10 font-bold px-3 py-1.5 rounded-xl"
            >
              Start Feed
            </Button>
          </div>
        )}

        {/* Captured image snapshot */}
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Selfie preview"
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 1, visibility: "visible", zIndex: 1 }}
          />
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {!capturedImage ? (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold rounded-xl text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCapture}
              disabled={isLoading || hasPermission === false}
              className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 rounded-xl text-xs px-4 gap-1.5"
            >
              <Camera className="h-4 w-4" />
              Capture Selfie
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleRetake}
              className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold rounded-xl text-xs px-4 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-green-600 text-white hover:bg-green-700 font-bold shadow-md shadow-green-600/10 rounded-xl text-xs px-4 gap-1.5"
            >
              <Check className="h-4 w-4" />
              Use Photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
export default CameraCapture;
