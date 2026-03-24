import React, { useState } from "react";
import { Film, Image, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function MediaLibrary({ medias, onMediasChange }) {
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const newMedia = await base44.entities.Media.create({
      title: file.name.replace(/\.[^/.]+$/, ""),
      type,
      file_url,
    });
    
    onMediasChange([...medias, newMedia]);
    setUploading(false);
  };

  const handleDelete = async (mediaId) => {
    await base44.entities.Media.delete(mediaId);
    onMediasChange(medias.filter(m => m.id !== mediaId));
  };

  const handleRename = async (media) => {
    if (!editTitle.trim()) return;
    await base44.entities.Media.update(media.id, { title: editTitle });
    onMediasChange(medias.map(m => m.id === media.id ? { ...m, title: editTitle } : m));
    setEditingId(null);
    setEditTitle("");
  };

  const startEdit = (media) => {
    setEditingId(media.id);
    setEditTitle(media.title);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
          Bibliothèque de médias
        </h2>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3 text-blue-400" />}
              Vidéo
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleUpload(e, "VIDEO")}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3 text-emerald-400" />}
              Image
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, "IMAGE")}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {medias.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-zinc-600 text-sm">
            Aucun média. Ajoutez des vidéos ou images.
          </div>
        ) : (
          medias.map((media) => (
            <div
              key={media.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("media", JSON.stringify(media));
              }}
              className="group relative bg-zinc-800/70 border border-zinc-700 rounded-lg p-2 cursor-move hover:border-zinc-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                {media.type === "VIDEO" ? (
                  <Film className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Image className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                {editingId === media.id ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(media)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(media);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-6 text-xs flex-1 bg-zinc-900 border-zinc-600"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-xs text-zinc-300 truncate flex-1"
                    onDoubleClick={() => startEdit(media)}
                  >
                    {media.title}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(media.id)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}