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
  
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [capturedFile, setCapturedFile] = React.useState<File | null>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize camera stream
  React.useEffect(() => {
    async function startCamera() {
      setIsLoading(true);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
        setStream(mediaStream);
        setHasPermission(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera capture access error:", err);
        setHasPermission(false);
        toast.error("Could not access camera. Please check site permissions.");
      } finally {
        setIsLoading(false);
      }
    }

    startCamera();

    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
    }
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      
      // Stop camera tracks
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square max-w-sm mx-auto overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-inner flex items-center justify-center">
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[11px] font-bold">Requesting camera access...</span>
          </div>
        )}

        {hasPermission === false && (
          <div className="flex flex-col items-center gap-2 p-5 text-center text-red-500">
            <CameraOff className="h-8 w-8 text-red-500" />
            <span className="text-xs font-bold uppercase">Camera Access Blocked</span>
            <p className="text-[10px] text-zinc-400 font-medium max-w-[200px] mt-1">
              Please enable camera permissions in your browser address bar and refresh.
            </p>
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
          />
        )}

        {/* Captured image snapshot */}
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Selfie preview"
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {!capturedImage ? (
          <>
            <Button
              variant="outline"
              onClick={onCancel}
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
