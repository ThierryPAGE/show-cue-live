import React from "react";
import { GripVertical, Film, Image, Copy, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CueItem({ cue, index, onDuplicate, onDelete, isActive }) {
  const isVideo = cue.type === "VIDEO";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
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
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isVideo ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {cue.type}
          </span>
          <span className="text-sm font-medium text-zinc-200 truncate">{cue.title}</span>
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