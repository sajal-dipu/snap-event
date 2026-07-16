"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Trash2, Plus, Album } from "lucide-react";
import { useCreateAlbumMutation, useDeleteAlbumMutation } from "../hooks/useGallery";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { VirtualRoom } from "@/types";

interface AlbumManagerProps {
  isOpen: boolean;
  onClose: () => void;
  room: VirtualRoom;
}

export function AlbumManager({ isOpen, onClose, room }: AlbumManagerProps) {
  const [newAlbumName, setNewAlbumName] = React.useState("");

  const createAlbum = useCreateAlbumMutation(room.id);
  const deleteAlbum = useDeleteAlbumMutation(room.id);

  const albums: string[] = room.albums || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;

    if (albums.includes(name)) {
      setNewAlbumName("");
      return;
    }

    await createAlbum.mutateAsync(name);
    setNewAlbumName("");
  };

  const handleDelete = async (albumName: string) => {
    if (confirm(`Are you sure you want to delete the album "${albumName}"? All photos in this album will be moved to unassigned.`)) {
      await deleteAlbum.mutateAsync(albumName);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Albums"
      description={`Organize event photographs inside "${room.name}" into custom categories.`}
      className="max-w-md"
    >
      <div className="space-y-6 pt-2">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. Reception, Bride, Groom..."
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            disabled={createAlbum.isPending}
            className="flex-grow"
          />
          <Button
            type="submit"
            disabled={createAlbum.isPending || !newAlbumName.trim()}
            className="bg-primary text-primary-foreground font-bold shrink-0 gap-1.5"
          >
            {createAlbum.isPending ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add
              </>
            )}
          </Button>
        </form>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Album className="h-3.5 w-3.5" />
            Active Albums ({albums.length})
          </h4>

          {albums.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              No custom albums created yet. Add one above!
            </p>
          ) : (
            <div className="divide-y divide-border border border-border rounded-xl max-h-60 overflow-y-auto">
              {albums.map((albumName) => (
                <div
                  key={albumName}
                  className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">{albumName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(albumName)}
                    disabled={deleteAlbum.isPending}
                    className="h-8 w-8 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export default AlbumManager;
