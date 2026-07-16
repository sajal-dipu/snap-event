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
  Files
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { extractExif } from "@/utils/exif";
import { useCreatePhotoMutation } from "../hooks/useGallery";
import { db } from "@/lib/firebase/firestore";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "idle" | "uploading" | "success" | "failed" | "cancelled" | "processing_ai";
  progress: number;
  xhr: XMLHttpRequest | null;
  error?: string;
  previewUrl?: string;
  photoId?: string;
  aiStatus?: "processing" | "ready" | "failed";
}

interface RoomUploadQueueProps {
  files: File[];
  roomId: string;
  onClear: () => void;
  onUploadComplete?: () => void;
}

export function RoomUploadQueue({ files, roomId, onClear, onUploadComplete }: RoomUploadQueueProps) {
  const { user } = useAuth();
  const createPhoto = useCreatePhotoMutation();
  const queryClient = useQueryClient();

  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [isPaused, setIsPaused] = React.useState(false);
  const [activeUploads, setActiveUploads] = React.useState(0);

  // A ref to keep track of firestore unsubscribe functions
  const unsubscribes = React.useRef<Record<string, () => void>>({});

  // Clean up listeners on unmount
  React.useEffect(() => {
    return () => {
      Object.values(unsubscribes.current).forEach((unsub) => unsub());
    };
  }, []);

  const concurrency = 3;

  const updateItemStatus = React.useCallback((
    id: string,
    status: QueueItem["status"],
    progress: number,
    error?: string
  ) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              progress,
              error,
              xhr: (status === "success" || status === "failed" || status === "cancelled") ? null : item.xhr
            }
          : item
      )
    );
  }, []);

  const updateItemProgress = React.useCallback((id: string, progress: number) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, progress } : item))
    );
  }, []);

  // Unsigned upload to Cloudinary & Metadata write to both root collection and subcollection
  const uploadFile = React.useCallback(async (item: QueueItem) => {
    updateItemStatus(item.id, "uploading", 0);

    try {
      const photographerId = user?.uid;
      if (!photographerId) throw new Error("Unauthenticated user profile");

      let exif = null;
      try {
        exif = await extractExif(item.file);
      } catch (exifErr) {
        console.warn("Could not extract EXIF data:", exifErr);
      }

      const folderPath = `snapevent/photographers/${photographerId}/rooms/${roomId}/original`;
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folderPath);

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateItemProgress(item.id, progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);

            // 1. Save metadata to root collection
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

            // 2. Save metadata to PART 3 subcollection: photographers/{photographerId}/rooms/{roomId}/photos
            try {
              const subPhotoRef = doc(db, "photographers", photographerId, "rooms", roomId, "photos", photoId);
              await setDoc(subPhotoRef, {
                photoId: photoId,
                roomId: roomId,
                photographerId: photographerId,
                publicId: result.public_id,
                secureUrl: result.secure_url,
                thumbnailUrl: result.secure_url.replace("/upload/", "/upload/c_thumb,w_250,h_250,g_face,q_auto,f_auto/"),
                width: result.width,
                height: result.height,
                size: result.bytes,
                format: result.format || result.secure_url.split(".").pop() || "jpg",
                favoriteCount: 0,
                downloadCount: 0,
                createdAt: serverTimestamp(),
              });
            } catch (subErr) {
              console.warn("Subcollection write blocked (this is expected if Firestore rules match nested collection is restricted):", subErr);
            }

            // Set state to processing_ai and store photoId
            setQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, photoId, status: "processing_ai", aiStatus: "processing", progress: 100 }
                  : i
              )
            );

            // Subscribe to real-time updates on this photo doc
            const docRef = doc(db, "photos", photoId);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.isProcessed) {
                  // AI Finished!
                  setQueue((prev) =>
                    prev.map((i) =>
                      i.id === item.id
                        ? { ...i, status: "success", aiStatus: "ready" }
                        : i
                    )
                  );
                  // Invalidate/Refresh the gallery cache immediately
                  queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
                  
                  // Unsubscribe this listener
                  if (unsubscribes.current[item.id]) {
                    unsubscribes.current[item.id]();
                    delete unsubscribes.current[item.id];
                  }
                } else if (data.status === "failed") {
                  // AI Failed
                  setQueue((prev) =>
                    prev.map((i) =>
                      i.id === item.id
                        ? { ...i, status: "failed", aiStatus: "failed", error: data.processingError || "AI processing failed" }
                        : i
                    )
                  );
                  // Unsubscribe this listener
                  if (unsubscribes.current[item.id]) {
                    unsubscribes.current[item.id]();
                    delete unsubscribes.current[item.id];
                  }
                }
              }
            });

            unsubscribes.current[item.id] = unsubscribe;

            // Trigger AI face extraction API in the background (fire-and-forget)
            fetch("/api/gallery/process-photo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId, roomId }),
            }).catch((apiErr) => {
              console.error("AI trigger failed:", apiErr);
            });
          } catch (dbErr: any) {
            console.error("Firestore save error:", dbErr);
            updateItemStatus(item.id, "failed", 100, dbErr.message || "Failed to save photo doc");
          }
        } else {
          updateItemStatus(item.id, "failed", 100, `Cloudinary HTTP Error ${xhr.status}`);
        }
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      xhr.onerror = () => {
        updateItemStatus(item.id, "failed", 100, "Network connection issue");
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      xhr.onabort = () => {
        updateItemStatus(item.id, "cancelled", 0, "Upload cancelled");
        setActiveUploads((prev) => Math.max(0, prev - 1));
      };

      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, xhr } : i))
      );

      xhr.send(formData);
      setActiveUploads((prev) => prev + 1);
    } catch (err: any) {
      console.error("Upload handler error:", err);
      updateItemStatus(item.id, "failed", 0, err.message || "Failed to upload file");
      setActiveUploads((prev) => Math.max(0, prev - 1));
    }
  }, [user, roomId, createPhoto, updateItemStatus, updateItemProgress]);

  // Initializing file items & creating object URLs for previews
  React.useEffect(() => {
    if (files.length === 0) {
      setQueue([]);
      return;
    }

    const initialQueue: QueueItem[] = files.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      file,
      name: file.name,
      size: file.size,
      status: "idle",
      progress: 0,
      xhr: null,
      previewUrl: URL.createObjectURL(file),
    }));

    setQueue(initialQueue);

    return () => {
      initialQueue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [files]);

  // Queue orchestrator hook
  React.useEffect(() => {
    if (isPaused) return;

    const idleItems = queue.filter((item) => item.status === "idle");
    const uploadingCount = queue.filter((item) => item.status === "uploading").length;

    if (uploadingCount < concurrency && idleItems.length > 0) {
      const slotsAvailable = concurrency - uploadingCount;
      const itemsToUpload = idleItems.slice(0, slotsAvailable);

      itemsToUpload.forEach((item) => {
        uploadFile(item);
      });
    }

    // Call onUploadComplete hook when queue becomes fully completed
    const activeCount = queue.filter(
      (item) => item.status === "uploading" || item.status === "idle"
    ).length;
    const finishedCount = queue.filter(
      (item) => item.status === "success" || item.status === "failed" || item.status === "cancelled"
    ).length;

    if (queue.length > 0 && activeCount === 0 && finishedCount === queue.length) {
      if (onUploadComplete) {
        onUploadComplete();
      }
    }
  }, [queue, isPaused, uploadFile, onUploadComplete]);

  const cancelUpload = React.useCallback((id: string) => {
    const item = queue.find((i) => i.id === id);
    if (item) {
      if (item.xhr) {
        item.xhr.abort();
      } else {
        updateItemStatus(id, "cancelled", 0, "Cancelled by user");
      }
      // Unsubscribe Firestore listener if exists
      if (unsubscribes.current[id]) {
        unsubscribes.current[id]();
        delete unsubscribes.current[id];
      }
    }
  }, [queue, updateItemStatus]);

  const retryUpload = React.useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "idle", progress: 0, error: undefined } : item))
    );
  }, []);

  const cancelAll = React.useCallback(() => {
    queue.forEach((item) => {
      if (item.status === "uploading" && item.xhr) {
        item.xhr.abort();
      } else if (item.status === "idle") {
        updateItemStatus(item.id, "cancelled", 0, "Cancelled by user");
      }
    });
    setIsPaused(true);
  }, [queue, updateItemStatus]);

  const retryAllFailed = React.useCallback(() => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === "failed" || item.status === "cancelled"
          ? { ...item, status: "idle", progress: 0, error: undefined }
          : item
      )
    );
    setIsPaused(false);
  }, []);

  const totalFiles = queue.length;
  const completedCount = queue.filter((i) => i.status === "success").length;
  const failedCount = queue.filter((i) => i.status === "failed").length;
  const cancelledCount = queue.filter((i) => i.status === "cancelled").length;
  const remainingCount = totalFiles - completedCount - failedCount - cancelledCount;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Files className="h-4 w-4 text-primary" />
            Upload Progress ({completedCount} / {totalFiles} Completed)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Uploading images directly to Cloudinary and writing metadata to Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {remainingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs font-bold border-zinc-200 dark:border-zinc-800 rounded-xl"
            >
              {isPaused ? <Play className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : <Pause className="h-3.5 w-3.5 text-amber-500 mr-1.5" />}
              {isPaused ? "Resume Queue" : "Pause Queue"}
            </Button>
          )}

          {failedCount + cancelledCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryAllFailed}
              className="text-xs font-bold border-zinc-200 dark:border-zinc-800 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry Failed
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
          >
            Clear / Close
          </Button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto border border-border rounded-xl divide-y divide-border">
        {queue.map((item) => (
          <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 bg-zinc-50/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-grow">
              {item.previewUrl ? (
                <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border shrink-0">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className={`h-full w-full object-cover transition-all duration-300 ${
                      item.status === "processing_ai" ? "blur-[4px] scale-110" : ""
                    }`}
                  />
                  {item.status === "processing_ai" && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Loader className="h-4 w-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Files className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-grow">
                <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {(item.size / (1024 * 1024)).toFixed(2)} MB
                </p>

                {item.status === "uploading" && (
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {item.error && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {item.error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.status === "uploading" && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  <span>{item.progress}%</span>
                  <Button variant="ghost" size="icon" onClick={() => cancelUpload(item.id)} className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900">
                    <X className="h-4.5 w-4.5" />
                  </Button>
                </div>
              )}

              {item.status === "processing_ai" && (
                <span className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  AI Processing...
                </span>
              )}

              {item.status === "success" && (
                <span className="flex items-center gap-1 text-xs text-green-500 font-bold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 animate-in fade-in duration-300">
                  <CheckCircle className="h-4.5 w-4.5" />
                  Ready
                </span>
              )}

              {item.status === "failed" && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => retryUpload(item.id)} className="h-7 w-7 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-lg" title="Retry">
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => cancelUpload(item.id)} className="h-7 w-7 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
                    <X className="h-4.5 w-4.5" />
                  </Button>
                </div>
              )}

              {item.status === "cancelled" && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 font-bold border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-900">Cancelled</span>
                  <Button variant="outline" size="icon" onClick={() => retryUpload(item.id)} className="h-7 w-7 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-lg" title="Retry">
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default RoomUploadQueue;
