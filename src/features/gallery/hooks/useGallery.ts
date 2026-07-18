import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { photoManagementService, NewPhotoInput } from "../services/PhotoManagementService";
import { toast } from "sonner";

/**
 * Hook to retrieve photos for a Virtual Room with infinite scroll support.
 */
export function useGalleryPhotos(
  roomId: string,
  filters: {
    albumId?: string | null;
    favorite?: boolean;
    search?: string;
    sortBy?: string;
  } = {},
  pageSize = 30
) {
  return useInfiniteQuery({
    queryKey: ["gallery-photos", roomId, filters, pageSize],
    queryFn: ({ pageParam }) =>
      photoManagementService.queryPhotos(roomId, filters, pageSize, pageParam as any),
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
  });
}

/**
 * Hook to retrieve photographer's favorites across all rooms.
 */
export function usePhotographerFavorites(photographerId: string, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: ["photographer-favorites", photographerId, pageSize],
    queryFn: ({ pageParam }) =>
      photoManagementService.getFavorites(photographerId, pageSize, pageParam as any),
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
  });
}

/**
 * Hook to retrieve soft-deleted photos for a photographer (Trash bin).
 */
export function useTrashPhotos(photographerId: string) {
  return useQuery({
    queryKey: ["gallery-trash", photographerId],
    queryFn: () => photoManagementService.getTrash(photographerId),
    enabled: !!photographerId,
  });
}

/**
 * Mutation to create a photo document in Firestore.
 */
export function useCreatePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewPhotoInput) => photoManagementService.create(data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      await queryClient.refetchQueries({ queryKey: ["gallery-photos"] });
      await queryClient.invalidateQueries({ queryKey: ["gallery-photos", variables.roomId] });
      await queryClient.refetchQueries({ queryKey: ["gallery-photos", variables.roomId] });
      await queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
    },
  });
}

/**
 * Mutation to toggle photo favorite status.
 */
export function useToggleFavoriteMutation(roomId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, favorite }: { photoId: string; favorite: boolean }) =>
      photoManagementService.toggleFavorite(photoId, favorite),
    onSuccess: (_, variables) => {
      if (roomId) {
        queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
      }
      queryClient.invalidateQueries({ queryKey: ["photographer-favorites"] });
      toast.success(variables.favorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to update favorite status");
    },
  });
}

/**
 * Mutation to rename a photo.
 */
export function useRenamePhotoMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, newName }: { photoId: string; newName: string }) =>
      photoManagementService.rename(photoId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
      toast.success("Photo renamed successfully");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to rename photo");
    },
  });
}

/**
 * Mutation to move photos to an album.
 */
export function useMovePhotosMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoIds, albumId }: { photoIds: string[]; albumId: string | null }) =>
      photoManagementService.movePhotosToAlbum(photoIds, albumId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
      toast.success(
        variables.albumId
          ? `Moved ${variables.photoIds.length} photos to ${variables.albumId}`
          : `Removed ${variables.photoIds.length} photos from album`
      );
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to move photos");
    },
  });
}

/**
 * Mutation to soft-delete photos (send to trash).
 */
export function useSoftDeletePhotosMutation(roomId: string, photographerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: string[]) =>
      photoManagementService.softDelete(photoIds, roomId, photographerId),
    onSuccess: (_, photoIds) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
      queryClient.invalidateQueries({ queryKey: ["gallery-trash", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success(`Moved ${photoIds.length} photos to trash`);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete photos");
    },
  });
}

/**
 * Mutation to restore photos from trash.
 */
export function useRestorePhotosMutation(photographerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoIds, roomId }: { photoIds: string[]; roomId: string }) =>
      photoManagementService.restore(photoIds, roomId, photographerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["gallery-trash", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success(`Restored ${variables.photoIds.length} photos`);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to restore photos");
    },
  });
}

/**
 * Mutation to permanently delete photos.
 */
export function usePermanentDeletePhotosMutation(photographerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photos: { id: string; cloudinaryPublicId: string }[]) =>
      photoManagementService.permanentDelete(photos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-trash", photographerId] });
      toast.success("Photos permanently deleted");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete photos permanently");
    },
  });
}

/**
 * Mutation to create a room album.
 */
export function useCreateAlbumMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumName: string) => photoManagementService.createAlbum(roomId, albumName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms", roomId] });
      toast.success("Album created successfully");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to create album");
    },
  });
}

/**
 * Mutation to delete a room album.
 */
export function useDeleteAlbumMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumName: string) => photoManagementService.deleteAlbum(roomId, albumName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms", roomId] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos", roomId] });
      toast.success("Album deleted successfully");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete album");
    },
  });
}
