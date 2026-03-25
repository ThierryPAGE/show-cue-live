import React, { useState, useRef, useEffect } from "react";
import { GripVertical, Film, Image, Copy, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CueItem({ cue, index, onDuplicate, onDelete, onTitleChange, isActive }) {
  const isVideo = cue.type === "VIDEO";
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(cue.title || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraftTitle(cue.title || "");
    setEditingTitle(true);
  };

  const commitEdit = () => {
    const trimmed = draftTitle.trim() || (isVideo ? "Video" : "Image");
    setEditingTitle(false);
    if (trimmed !== cue.title) onTitleChange?.(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditingTitle(false); setDraftTitle(cue.title || ""); }
  };

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
        isActive
          ? "border-yellow-500/60 bg-yellow-500/10"
          : "border-zinc-700/50 bg-zinc-800/60 hover:bg-zinc-800"
      }`}
    >
      <div className="cursor-grab text-zinc-500 hover:text-zinc-300">
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-700/50 text-zinc-400 text-sm font-mono font-bold">
        {index + 1}
      </div>

      <div
        className={`flex items-center justify-center w-8 h-8 rounded-md ${
          isVideo ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
        }`}
      >
        {isVideo ? <Film className="w-4 h-4" /> : <Image className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isVideo ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {cue.type}
          </span>
          {editingTitle ? (
            <input
              ref={inputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-zinc-700 border border-zinc-500 rounded px-2 py-0.5 text-sm font-medium text-zinc-100 outline-none focus:border-zinc-300"
            />
          ) : (
            <span
              className="text-sm font-medium text-zinc-200 truncate cursor-text group-hover:text-white"
              onDoubleClick={startEdit}
              title="Double-clic pour renommer"
            >
              {cue.title}
            </span>
          )}
          {!editingTitle && (
            <button
              onClick={startEdit}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
              title="Renommer"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5 truncate">
          {cue.file_url ? cue.file_url.split("/").pop() : "No file"}
          {isVideo && cue.fadeOutMs ? ` · Fade out: ${cue.fadeOutMs}ms` : ""}
          {!isVideo && cue.fadeInMs ? ` · Fade in: ${cue.fadeInMs}ms` : ""}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-zinc-500 hover:text-zinc-200" 
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(index);
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-zinc-500 hover:text-red-400" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}