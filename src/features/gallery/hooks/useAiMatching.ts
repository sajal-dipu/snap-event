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
  confidence: number;
  createdAt: any;
}

interface MatchSelfieParams {
  roomId: string;
  selfieFile: File;
}

interface MatchSelfieResult {
  success: boolean;
  roomId: string;
  photoCount: number;
  photos: MatchedPhotoInfo[];
}

/**
 * Mutation to match guest's face selfie against event room.
 */
export function useMatchSelfieMutation() {
  return useMutation<MatchSelfieResult, Error, MatchSelfieParams>({
    mutationFn: async ({ roomId, selfieFile }) => {
      const formData = new FormData();
      formData.append("roomId", roomId);
      formData.append("file", selfieFile);

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
