import { useMutation, useQueryClient } from "@tanstack/react-query";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { toast } from "sonner";

export interface MatchedPhotoInfo {
  id: string;
  fileName: string;
  secureUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  width: number;
  height: number;
  confidence: number;          // Similarity score (e.g. 0.9421)
  faceConfidence?: number;     // Detection confidence score (e.g. 0.98)
  confidencePercent?: string;  // Formatted match string (e.g. "94% MATCH")
  createdAt: any;
}

interface MatchSelfieParams {
  roomId: string;
  selfieFile?: File;
  selfieFiles?: File[];
  threshold?: number;
}

interface MatchSelfieResult {
  success: boolean;
  roomId: string;
  thresholdUsed: number;
  photoCount: number;
  photos: MatchedPhotoInfo[];
}

/**
 * Mutation to match guest's face selfie(s) against event room.
 */
export function useMatchSelfieMutation() {
  return useMutation<MatchSelfieResult, Error, MatchSelfieParams>({
    mutationFn: async ({ roomId, selfieFile, selfieFiles, threshold }) => {
      const formData = new FormData();
      formData.append("roomId", roomId);
      
      const filesToUpload: File[] = [];
      if (selfieFiles && selfieFiles.length > 0) {
        filesToUpload.push(...selfieFiles);
      }
      if (selfieFile) {
        filesToUpload.push(selfieFile);
      }

      filesToUpload.forEach((f) => formData.append("files", f));

      if (threshold !== undefined) {
        formData.append("threshold", threshold.toString());
      }

      const response = await fetch("/api/gallery/match-faces", {
        method: "POST",
        body: formData,
      });


      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Selfie face match query failed.");
      }

      return response.json();
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Failed to analyze selfie face.");
    },
  });
}

export interface SubmitFeedbackParams {
  photoId: string;
  roomId: string;
  feedback: "this_is_me" | "not_my_photo";
  confidenceScore?: number;
  guestUid?: string;
}

/**
 * Mutation to record user feedback ("This is me" vs "Not my photo").
 */
export function useSubmitMatchFeedbackMutation() {
  return useMutation<{ success: boolean; message: string }, Error, SubmitFeedbackParams>({
    mutationFn: async (params) => {
      const response = await fetch("/api/gallery/match-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to submit match feedback.");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Failed to submit feedback.");
    },
  });
}

interface CreateDownloadRequestParams {
  roomId: string;
  photographerId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialMessage?: string;
  requestedPhotoIds: string[];
}

/**
 * Mutation to create a download request for selected matched photos.
 */
export function useCreateDownloadRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, CreateDownloadRequestParams>({
    mutationFn: async (params) => {
      const resultId = await downloadRequestService.create(params);
      return resultId;
    },
    onSuccess: () => {
      toast.success("Download request submitted successfully! The photographer will approve it soon.");
      queryClient.invalidateQueries({ queryKey: ["download-requests"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Failed to submit download request.");
    },
  });
}
