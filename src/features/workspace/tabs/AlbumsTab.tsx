"use client";

import * as React from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { VirtualRoom } from "@/types";

export interface AlbumsTabProps {
  room: VirtualRoom;
  newAlbumName: string;
  setNewAlbumName: (val: string) => void;
  handleCreateAlbum: (e: React.FormEvent) => void;
  handleDeleteAlbum: (albumName: string) => void;
  createAlbumPending: boolean;
  deleteAlbumPending: boolean;
}

export function AlbumsTab({
  room,
  newAlbumName,
  setNewAlbumName,
  handleCreateAlbum,
  handleDeleteAlbum,
  createAlbumPending,
  deleteAlbumPending
}: AlbumsTabProps) {
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-bold text-foreground">Manage Custom Categories</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Create albums (e.g. Ceremony, Reception, Portraits) to help clients and guests filter images easily.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Create form */}
          <form onSubmit={handleCreateAlbum} className="flex gap-3">
            <Input
              type="text"
              placeholder="e.g. Reception, Ceremony, Pre-Wedding"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              className="flex-grow rounded-xl text-xs"
              maxLength={40}
              disabled={createAlbumPending}
            />
            <Button
              type="submit"
              disabled={createAlbumPending || !newAlbumName.trim()}
              className="bg-primary text-primary-foreground font-bold rounded-xl px-5 flex items-center gap-1.5"
            >
              {createAlbumPending ? <LoadingSpinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Add Category
            </Button>
          </form>

          {/* Active albums list */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              Active Albums ({(room.albums || []).length})
            </h4>

            {(room.albums || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center border border-dashed border-border rounded-xl">
                No custom categories created yet. Create one above!
              </p>
            ) : (
              <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card/50">
                {(room.albums || []).map((albumName) => (
                  <div
                    key={albumName}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors"
                  >
                    <span className="text-xs font-bold text-foreground">{albumName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAlbum(albumName)}
                      disabled={deleteAlbumPending}
                      className="h-8 w-8 text-red-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      aria-label={`Delete ${albumName} album`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
export default AlbumsTab;
