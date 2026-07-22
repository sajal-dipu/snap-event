"use client";

import * as React from "react";
import {
  Play,
  Pause,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
  Gauge,
  Clock,
  Files
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { extractExif } from "@/utils/exif";
import { useCreatePhotoMutation } from "../hooks/useGallery";
import { toast } from "sonner";


export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "idle" | "uploading" | "success" | "failed" | "cancelled";
  progress: number;
  xhr: XMLHttpRequest | null;
  error?: string;
}

interface UploadQueueProps {
  files: File[];
  roomId: string;
  onClear: () => void;
  onUploadComplete?: () => void;
}

export function UploadQueue({ files, roomId, onClear, onUploadComplete }: UploadQueueProps) {
  const { user } = useAuth();
  const createPhoto = useCreatePhotoMutation();

  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [isPaused, setIsPaused] = React.useState(false);
  const [activeUploads, setActiveUploads] = React.useState(0);

  // Speed and ETA calculations states
  const [speed, setSpeed] = React.useState(0); // MB/s
  const [eta, setEta] = React.useState<number | null>(null); // seconds
  const speedIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Keep track of loaded bytes per second to compute speed
  const bytesLoadedTrackerRef = React.useRef<Record<string, number>>({});
  const lastCheckedBytesRef = React.useRef(0);

  const concurrency = 3;

  // Helper update states
  const updateItemStatus = React.useCallback((
    id: string,
    status: QueueItem["status"],
    progress: number,
    error?: string
  ) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, progress, error, xhr: (status === "success" || status === "failed" || status === "cancelled") ? null : item.xhr }
          : item
      )
    );
  }, []);

  const updateItemProgress = React.useCallback((id: string, progress: number) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, progress } : item))
    );
  }, []);

  const uploadingIdsRef = React.useRef<Set<string>>(new Set());

  // Execute upload request to Cloudinary
  const uploadFile = React.useCallback(async (item: QueueItem) => {
    console.log("UPLOAD START");
    console.log("UPLOAD FUNCTION CALLED", item.name);

    if (uploadingIdsRef.current.has(item.id)) {
      console.log(`[LOG] UPLOAD SKIPPED: Item "${item.name}" (id: ${item.id}) is already currently uploading.`);
      return;
    }
    uploadingIdsRef.current.add(item.id);

    updateItemStatus(item.id, "uploading", 0);
    console.log(`[LOG] Starting generic upload workflow for "${item.name}" (${item.size} bytes) in room "${roomId}"`);

    try {
      const photographerId = user?.uid;
      if (!photographerId) {
        const errMsg = "Unauthenticated user profile. Please log in as a photographer.";
        console.error(`[LOG] Upload Error: ${errMsg}`);
        toast.error(errMsg);
        updateItemStatus(item.id, "failed", 0, errMsg);
        uploadingIdsRef.current.delete(item.id);
        return;
      }

      if (!roomId) {
        const errMsg = "Missing target roomId for upload.";
        console.error(`[LOG] Upload Error: ${errMsg}`);
        toast.error(errMsg);
        updateItemStatus(item.id, "failed", 0, errMsg);
        uploadingIdsRef.current.delete(item.id);
        return;
      }

      const maxSizeBytes = 20 * 1024 * 1024;
      if (item.file.size > maxSizeBytes) {
        const errMsg = `File "${item.name}" exceeds 20MB limit (${(item.file.size / (1024 * 1024)).toFixed(1)}MB).`;
        console.error(`[LOG] Upload Error: ${errMsg}`);
        toast.error(errMsg);
        updateItemStatus(item.id, "failed", 0, errMsg);
        uploadingIdsRef.current.delete(item.id);
        return;
      }

      // Extract EXIF client-side
      let exif = null;
      try {
        exif = await extractExif(item.file);
      } catch (exifErr) {
        console.warn("[LOG] Could not extract EXIF data:", exifErr);
      }

      // 2. Prepare unsigned upload
      const folderPath = `snapevent/photographers/${photographerId}/rooms/${roomId}/original`;
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        const errMsg = "Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.";
        console.error(`[LOG] Upload Error: ${errMsg}`);
        toast.error(errMsg);
        updateItemStatus(item.id, "failed", 0, errMsg);
        uploadingIdsRef.current.delete(item.id);
        return;
      }

      // 3. Initiate XMLHttpRequest upload to Cloudinary
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folderPath);

      console.log(`[LOG] CALLING CLOUDINARY UPLOAD API FOR: ${item.name}`);
      console.log(`[LOG] Starting Cloudinary upload for "${item.name}". Preset: "${uploadPreset}", Cloud: "${cloudName}"`);

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

      // Progress listener
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateItemProgress(item.id, progress);
        }
      };

      // Completion listener
      xhr.onload = async () => {
        console.log(`[LOG] Cloudinary response status for "${item.name}": ${xhr.status}`);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log(`[LOG] Cloudinary upload successful for "${item.name}":`, {
              secure_url: result.secure_url,
              public_id: result.public_id,
            });

            console.log(`[LOG] CALLING FIRESTORE SAVE DOC FOR: ${item.name}`);
            console.log(`[LOG] Saving metadata to Firestore for "${item.name}"...`);
            const photoId = await createPhoto.mutateAsync({
              roomId,
              photographerId,
              cloudinaryPublicId: result.public_id,
              secureUrl: result.secure_url,
              thumbnailUrl: result.secure_url.replace("/upload/", "/upload/c_thumb,w_250,h_250,g_face,q_auto,f_auto/"),
              mediumUrl: result.secure_url.replace("/upload/", "/upload/c_limit,w_800,q_auto,f_auto/"),
              largeUrl: result.secure_url.replace("/upload/", "/upload/c_limit,w_1600,q_auto,f_auto/"),
              width: result.width,
              height: result.height,
              aspectRatio: result.width / result.height,
              fileSize: result.bytes,
              fileName: item.name,
              albumId: null,
              exif,
              tags: result.tags || [],
            });
            console.log(`[LOG] Firestore document created successfully. photoId: "${photoId}"`);

            // Trigger background face recognition analysis on the AI service (fire-and-forget)
            fetch("/api/gallery/process-photo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId, roomId }),
            }).catch((apiErr) => {
              console.error("[LOG] AI face registration API failed:", apiErr);
            });

            updateItemStatus(item.id, "success", 100);
          } catch (dbErr: any) {
            const errMsg = `Firestore save error for "${item.name}": ${dbErr.message || "Failed to save photo doc"}`;
            console.error(`[LOG] ${errMsg}`, dbErr);
            toast.error(errMsg);
            updateItemStatus(item.id, "failed", 100, errMsg);
          }
        } else {
          let cErrorMsg = `Cloudinary HTTP Error ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            cErrorMsg = parsed.error?.message || cErrorMsg;
          } catch (e) {
            cErrorMsg = xhr.responseText || cErrorMsg;
          }
          const fullErr = `Upload failed for "${item.name}": ${cErrorMsg}`;
          console.error(`[LOG] ${fullErr}`);
          toast.error(fullErr);
          updateItemStatus(item.id, "failed", 100, fullErr);
        }
        uploadingIdsRef.current.delete(item.id);
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      // Error listener
      xhr.onerror = () => {
        const errMsg = `Network error while uploading "${item.name}". Please check internet connection.`;
        console.error(`[LOG] ${errMsg}`);
        toast.error(errMsg);
        updateItemStatus(item.id, "failed", 100, errMsg);
        uploadingIdsRef.current.delete(item.id);
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      // Abort listener
      xhr.onabort = () => {
        console.warn(`[LOG] Upload execution cancelled by user for "${item.name}".`);
        updateItemStatus(item.id, "cancelled", 0, "Upload cancelled by user");
        uploadingIdsRef.current.delete(item.id);
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      // Register XHR to enable abort
      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, xhr } : i))
      );

      // Trigger upload
      xhr.send(formData);
      setActiveUploads((prev) => prev + 1);
    } catch (err: any) {
      const fatalErr = `Upload fatal error for "${item.name}": ${err.message || "Unexpected exception"}`;
      console.error("[LOG] Fatal exception caught in upload handler:", err);
      toast.error(fatalErr);
      updateItemStatus(item.id, "failed", 0, fatalErr);
      uploadingIdsRef.current.delete(item.id);
      setActiveUploads((prev) => Math.max(0, prev - 1));
    }
  }, [user, roomId, createPhoto, updateItemStatus, updateItemProgress]);



  // Initialize queue when files change
  React.useEffect(() => {
    if (files.length === 0) {
      setQueue([]);
      return;
    }

    const items: QueueItem[] = files.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      file,
      name: file.name,
      size: file.size,
      status: "idle",
      progress: 0,
      xhr: null,
    }));

    setQueue(items);
    setIsPaused(false);
    lastCheckedBytesRef.current = 0;
    bytesLoadedTrackerRef.current = {};
    setSpeed(0);
    setEta(null);
  }, [files]);

  // Global upload stats
  const totalFiles = queue.length;
  const successCount = queue.filter((item) => item.status === "success").length;
  const errorCount = queue.filter((item) => item.status === "failed").length;
  const remainingCount = totalFiles - successCount - errorCount;

  // Calculate overall progress bar
  const totalBytes = queue.reduce((sum, item) => sum + item.size, 0);
  const totalLoadedBytes = queue.reduce((sum, item) => {
    if (item.status === "success") return sum + item.size;
    if (item.status === "failed" || item.status === "cancelled") return sum;
    const progressBytes = (item.progress / 100) * item.size;
    return sum + progressBytes;
  }, 0);
  const overallProgress = totalBytes > 0 ? Math.round((totalLoadedBytes / totalBytes) * 100) : 0;

  // Real-time speed calculation worker
  React.useEffect(() => {
    const isUploadingAny = queue.some((item) => item.status === "uploading");

    if (isUploadingAny && !isPaused) {
      if (!speedIntervalRef.current) {
        speedIntervalRef.current = setInterval(() => {
          const currentLoaded = queue.reduce((sum, item) => {
            if (item.status === "success") return sum + item.size;
            if (item.status === "failed" || item.status === "cancelled") return sum;
            return sum + (item.progress / 100) * item.size;
          }, 0);

          const bytesUploadedThisInterval = Math.max(0, currentLoaded - lastCheckedBytesRef.current);
          lastCheckedBytesRef.current = currentLoaded;

          // Speed in MB/s
          const currentSpeedMB = bytesUploadedThisInterval / (1024 * 1024);
          setSpeed(currentSpeedMB);

          // ETA calculation
          const bytesRemaining = Math.max(0, totalBytes - currentLoaded);
          if (bytesUploadedThisInterval > 0) {
            const timeRemaining = bytesRemaining / bytesUploadedThisInterval; // in seconds
            setEta(Math.round(timeRemaining));
          } else {
            setEta(null);
          }
        }, 1000);
      }
    } else {
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
      setSpeed(0);
      setEta(null);
    }

    return () => {
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
    };
  }, [queue, isPaused, totalBytes]);

  // Queue runner
  React.useEffect(() => {
    if (isPaused || !user) return;

    const idleItems = queue.filter((item) => item.status === "idle");
    const activeItemsCount = queue.filter((item) => item.status === "uploading").length;

    if (activeItemsCount < concurrency && idleItems.length > 0) {
      const slotsToFill = concurrency - activeItemsCount;
      const itemsToStart = idleItems.slice(0, slotsToFill);

      itemsToStart.forEach((item) => {
        uploadFile(item);
      });
    }

    // Call onUploadComplete hook when finished
    if (totalFiles > 0 && remainingCount === 0 && activeItemsCount === 0) {
      onUploadComplete?.();
    }
  }, [queue, isPaused, user, activeUploads]);



  // pause queue
  const handlePause = () => {
    setIsPaused(true);
    // Abort and reset active uploads to "idle" status
    queue.forEach((item) => {
      if (item.status === "uploading" && item.xhr) {
        item.xhr.abort();
        updateItemStatus(item.id, "idle", 0);
      }
    });
    setSpeed(0);
    setEta(null);
  };

  // resume queue
  const handleResume = () => {
    setIsPaused(false);
  };

  // cancel whole queue
  const handleCancelAll = () => {
    queue.forEach((item) => {
      if (item.xhr) {
        item.xhr.abort();
      }
    });
    onClear();
  };

  // cancel single item
  const handleCancelItem = (id: string) => {
    const item = queue.find((i) => i.id === id);
    if (item) {
      if (item.xhr) {
        item.xhr.abort();
      } else {
        updateItemStatus(id, "cancelled", 0);
      }
    }
  };

  // retry failed items
  const handleRetryFailed = () => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === "failed" || item.status === "cancelled"
          ? { ...item, status: "idle", progress: 0, error: undefined, xhr: null }
          : item
      )
    );
    setIsPaused(false);
  };

  // human bytes formatter
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatEta = (sec: number | null) => {
    if (sec === null) return "--:--";
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Global Progress Dashboard Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Files className="h-5 w-5 text-primary" />
              Upload Dashboard
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Uploading {totalFiles} files • {successCount} succeeded • {errorCount} failed
            </p>
          </div>

          {/* Controller buttons */}
          <div className="flex items-center gap-2">
            {remainingCount > 0 && (
              <Button
                variant="outline"
                onClick={isPaused ? handleResume : handlePause}
                className="h-9 px-3.5 text-xs font-bold border-zinc-800 text-white hover:bg-zinc-900 gap-1.5"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 text-green-500 fill-current" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 text-yellow-500 fill-current" />
                    Pause
                  </>
                )}
              </Button>
            )}

            {errorCount > 0 && (
              <Button
                variant="outline"
                onClick={handleRetryFailed}
                className="h-9 px-3.5 text-xs font-bold border-zinc-800 text-white hover:bg-zinc-900 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Retry Failed
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={handleCancelAll}
              className="h-9 px-3.5 text-xs font-extrabold gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancel All
            </Button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Overall Progress</span>
            <span className="font-mono text-primary">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Live upload speedometer and timer */}
        <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-semibold text-zinc-400">
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-900 rounded-xl p-3">
            <Gauge className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">Upload Speed</p>
              <p className="text-white font-mono mt-0.5">{speed.toFixed(2)} MB/s</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-900 rounded-xl p-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">Est. Time Remaining</p>
              <p className="text-white font-mono mt-0.5">{formatEta(eta)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue items list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-zinc-50 dark:bg-zinc-900/20">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Upload Queue ({queue.length} files)
          </h4>
        </div>

        <div className="divide-y divide-border max-h-[450px] overflow-y-auto">
          {queue.map((item) => (
            <div
              key={item.id}
              className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors"
            >
              {/* File Info */}
              <div className="min-w-0 flex-grow max-w-sm sm:max-w-md">
                <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatBytes(item.size)}
                  </span>
                  {item.status === "failed" && item.error && (
                    <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {item.error}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress and status controls */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Progress bar */}
                {item.status === "uploading" && (
                  <div className="hidden sm:flex flex-col items-end w-24 gap-1">
                    <span className="text-[10px] font-mono text-primary font-bold">{item.progress}%</span>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="w-20 text-center flex justify-center">
                  {item.status === "success" && (
                    <span className="text-[10px] font-extrabold text-green-500 bg-green-500/10 border border-green-500/20 py-0.5 px-2 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      DONE
                    </span>
                  )}
                  {item.status === "failed" && (
                    <span className="text-[10px] font-extrabold text-red-500 bg-red-500/10 border border-red-500/20 py-0.5 px-2 rounded-full flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      FAILED
                    </span>
                  )}
                  {item.status === "uploading" && (
                    <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full flex items-center gap-1">
                      <Loader className="h-3 w-3 animate-spin" />
                      {item.progress}%
                    </span>
                  )}
                  {item.status === "idle" && (
                    <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-border py-0.5 px-2 rounded-full">
                      QUEUED
                    </span>
                  )}
                  {item.status === "cancelled" && (
                    <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-border py-0.5 px-2 rounded-full">
                      ABORTED
                    </span>
                  )}
                </div>

                {/* Cancel single file button */}
                {item.status === "uploading" || item.status === "idle" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8" /> // spacer
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default UploadQueue;
