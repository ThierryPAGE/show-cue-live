import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CueEditDialog({ open, onOpenChange, cue, onSave, onMediaCreated }) {
  const [title, setTitle] = useState(cue?.title || "");
  const [fadeMs, setFadeMs] = useState(
    cue?.type === "VIDEO" ? (cue?.fadeOutMs || 1200) : (cue?.fadeInMs || 800)
  );
  const [fileUrl, setFileUrl] = useState(cue?.file_url || "");
  const [loop, setLoop] = useState(cue?.loop || false);
  const [autoplayNext, setAutoplayNext] = useState(cue?.autoplayNext || false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const isVideo = cue?.type === "VIDEO";

  // Réinitialiser l'état quand le dialog s'ouvre avec un nouveau cue
  React.useEffect(() => {
    if (open && cue) {
      setTitle(cue.title || "");
      setFadeMs(cue.type === "VIDEO" ? (cue.fadeOutMs || 1200) : (cue.fadeInMs || 800));
      setFileUrl(cue.file_url || "");
      setLoop(cue.loop || false);
      setAutoplayNext(cue.autoplayNext || false);
      setFileName("");
    }
  }, [open, cue]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    
    // Créer automatiquement le média dans la bibliothèque
    const newMedia = await base44.entities.Media.create({
      title: file.name.replace(/\.[^/.]+$/, ""),
      type: cue?.type,
      file_url,
    });
    
    if (onMediaCreated) {
      onMediaCreated(newMedia);
    }
    
    setUploading(false);
  };

  const handleSave = () => {
    const updated = {
      ...cue,
      title: title || (isVideo ? "Video" : "Image"),
      file_url: fileUrl,
      autoplayNext,
    };
    if (isVideo) {
      updated.fadeOutMs = Number(fadeMs) || 1200;
      updated.loop = loop;
    } else {
      updated.fadeInMs = Number(fadeMs) || 800;
    }
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {cue?.id ? "Edit" : "Add"} {isVideo ? "Video" : "Image"} Cue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-zinc-400">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isVideo ? "Video title" : "Image title"}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-400">{isVideo ? "MP4 File" : "Image File"}</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border border-dashed border-zinc-600 hover:border-zinc-400 bg-zinc-800/50 transition-colors">
                <Upload className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">
                  {uploading ? "Uploading..." : fileName || (fileUrl ? "File uploaded" : "Choose file")}
                </span>
                <input
                  type="file"
                  accept={isVideo ? "video/mp4,video/*" : "image/*"}
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
              {fileUrl && !uploading && (
                <div className="text-xs text-emerald-400 mt-1 truncate">✓ {fileUrl.split("/").pop()}</div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-zinc-400">
              {isVideo ? "Fade Out (ms)" : "Fade In (ms)"}
            </Label>
            <Input
              type="number"
              value={fadeMs}
              onChange={(e) => setFadeMs(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1 w-32"
            />
          </div>

          {isVideo && (
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="loop" className="text-zinc-400 cursor-pointer">
                Boucler la vidéo
              </Label>
              <Switch
                id="loop"
                checked={loop}
                onCheckedChange={setLoop}
              />
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="autoplayNext" className="text-zinc-400 cursor-pointer">
              Lecture automatique du suivant
            </Label>
            <Switch
              id="autoplayNext"
              checked={autoplayNext}
              onCheckedChange={setAutoplayNext}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!fileUrl || uploading} className="bg-white text-black hover:bg-zinc-200">
            {cue?.id ? "Update" : "Add"} Cue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}