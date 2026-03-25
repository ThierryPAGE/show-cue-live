import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Film,
  Image,
  Upload,
  Save,
  Zap,
  PlayCircle,
  Loader2,
} from "lucide-react";
import CueItem from "@/components/CueItem";
import CueEditDialog from "@/components/CueEditDialog";
import MediaLibrary from "@/components/MediaLibrary";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function Setup() {
  const [cues, setCues] = useState([]);
  const [safetyImageUrl, setSafetyImageUrl] = useState("");
  const [showId, setShowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState({ open: false, cue: null, index: -1 });
  const [uploadingSafety, setUploadingSafety] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testIndex, setTestIndex] = useState(-1);
  const [medias, setMedias] = useState([]);

  // Load existing show and medias
  useEffect(() => {
    (async () => {
      try {
        const [shows, mediaList] = await Promise.all([
          base44.entities.Show.list("-updated_date", 1),
          base44.entities.Media.list("-created_date", 100),
        ]);
        
        if (shows.length > 0) {
          const show = shows[0];
          setShowId(show.id);
          // Migrer les cues existants pour ajouter les propriétés loop et autoplayNext
          const migratedCues = (show.cues || []).map(cue => ({
            ...cue,
            loop: cue.loop !== undefined ? cue.loop : false,
            autoplayNext: cue.autoplayNext !== undefined ? cue.autoplayNext : false
          }));
          setCues(migratedCues);
          setSafetyImageUrl(show.safety_image_url || "");
          
          // Sauvegarder automatiquement si migration effectuée
          const needsMigration = (show.cues || []).some(cue => 
            cue.loop === undefined || cue.autoplayNext === undefined
          );
          if (needsMigration && migratedCues.length > 0) {
            await base44.entities.Show.update(show.id, {
              ...show,
              cues: migratedCues
            });
          }
        }
        setMedias(mediaList);
      } catch (error) {
        console.error("Error loading data:", error);
      }
      setLoading(false);
    })();
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(cues);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCues(items);
  };

  const addCue = (type) => {
    const newCue = {
      id: generateId(),
      media_id: null,
      type,
      title: type === "VIDEO" ? "New Video" : "New Image",
      file_url: "",
      fadeOutMs: type === "VIDEO" ? 1200 : undefined,
      fadeInMs: type === "IMAGE" ? 800 : undefined,
      autoplayNext: false,
    };
    setEditDialog({ open: true, cue: newCue, index: -1 });
  };

  const addCueFromMedia = (media) => {
    const newCue = {
      id: generateId(),
      media_id: media.id,
      type: media.type,
      title: media.title,
      file_url: media.file_url,
      fadeOutMs: media.type === "VIDEO" ? 1200 : undefined,
      fadeInMs: media.type === "IMAGE" ? 800 : undefined,
      autoplayNext: false,
    };
    setCues((prev) => [...prev, newCue]);
  };

  const renameCue = (index, newTitle) => {
    setCues((prev) => prev.map((c, i) => (i === index ? { ...c, title: newTitle } : c)));
  };

  const duplicateCue = (index) => {
    const orig = cues[index];
    const dup = { ...orig, id: generateId() };
    const updated = [...cues];
    updated.splice(index + 1, 0, dup);
    setCues(updated);
  };

  const deleteCue = (index) => {
    setCues((prev) => prev.filter((_, i) => i !== index));
    // Fermer le dialog si on supprime le cue en cours d'édition
    if (editDialog.open && editDialog.index === index) {
      setEditDialog({ open: false, cue: null, index: -1 });
    }
  };

  const handleCueEditSave = (updatedCue) => {
    if (editDialog.index === -1) {
      // New cue
      setCues((prev) => [...prev, updatedCue]);
    } else {
      setCues((prev) => prev.map((c, i) => (i === editDialog.index ? updatedCue : c)));
    }
  };

  const handleSafetyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSafety(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSafetyImageUrl(file_url);
    setUploadingSafety(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      title: "Concert Show",
      safety_image_url: safetyImageUrl,
      cues,
    };
    if (showId) {
      await base44.entities.Show.update(showId, data);
    } else {
      const created = await base44.entities.Show.create(data);
      setShowId(created.id);
    }
    setSaving(false);
  };

  // Test Run
  useEffect(() => {
    if (!testRunning) return;
    if (testIndex >= cues.length) {
      setTestRunning(false);
      setTestIndex(-1);
      return;
    }
    const timer = setTimeout(() => {
      setTestIndex((prev) => prev + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [testRunning, testIndex, cues.length]);

  const startTestRun = () => {
    if (cues.length === 0) return;
    setTestIndex(0);
    setTestRunning(true);
  };

  const stopTestRun = () => {
    setTestRunning(false);
    setTestIndex(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Concert Video Cue</h1>
            <p className="text-sm text-zinc-500 mt-1">Setup your show timeline</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200 gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
            <Link to={createPageUrl("LiveControl")}>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                <Zap className="w-4 h-4" />
                Mode Live
              </Button>
            </Link>
          </div>
        </div>

        {/* Safety Image */}
        <div className="mb-8 p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/50">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-bold">
            Image interlude de sécurité
          </Label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex-1 flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border border-dashed border-zinc-600 hover:border-zinc-400 bg-zinc-800/50 transition-colors">
              <Upload className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">
                {uploadingSafety ? "Uploading..." : safetyImageUrl ? "Change image" : "Upload safety image"}
              </span>
              <input type="file" accept="image/*" onChange={handleSafetyUpload} className="hidden" />
            </label>
            {safetyImageUrl && (
              <img src={safetyImageUrl} alt="Safety" className="w-16 h-10 object-cover rounded border border-zinc-600" />
            )}
          </div>
        </div>

        {/* Media Library */}
        <MediaLibrary medias={medias} onMediasChange={setMedias} />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-4 mt-6">
          <Button onClick={() => addCue("VIDEO")} variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 gap-2">
            <Film className="w-4 h-4 text-blue-400" />
            Add Video
          </Button>
          <Button onClick={() => addCue("IMAGE")} variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 gap-2">
            <Image className="w-4 h-4 text-emerald-400" />
            Add Image
          </Button>
          <div className="flex-1" />
          {!testRunning ? (
            <Button onClick={startTestRun} variant="outline" disabled={cues.length === 0} className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 gap-2">
              <PlayCircle className="w-4 h-4 text-amber-400" />
              Test Run
            </Button>
          ) : (
            <Button onClick={stopTestRun} variant="outline" className="bg-red-900/50 border-red-700 text-red-300 hover:bg-red-900 gap-2">
              Stop Test
            </Button>
          )}
        </div>

        {/* Cue List */}
        {cues.length === 0 ? (
          <div
            className="text-center py-16 border border-dashed border-zinc-700/50 rounded-xl"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const mediaData = e.dataTransfer.getData("media");
              if (mediaData) {
                const media = JSON.parse(mediaData);
                addCueFromMedia(media);
              }
            }}
          >
            <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-lg">Aucun cue</p>
            <p className="text-zinc-600 text-sm mt-1">Glissez-déposez des médias ici ou ajoutez-en manuellement</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="cues">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const mediaData = e.dataTransfer.getData("media");
                    if (mediaData) {
                      const media = JSON.parse(mediaData);
                      addCueFromMedia(media);
                    }
                  }}
                >
                  {cues.map((cue, index) => (
                    <Draggable key={cue.id} draggableId={cue.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setEditDialog({ open: true, cue, index })}
                          className="cursor-pointer"
                        >
                          <CueItem
                            cue={cue}
                            index={index}
                            onDuplicate={duplicateCue}
                            onDelete={deleteCue}
                            onTitleChange={(newTitle) => renameCue(index, newTitle)}
                            isActive={testRunning && testIndex === index}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Test Run Preview */}
        {testRunning && testIndex >= 0 && testIndex < cues.length && (
          <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 font-bold mb-2">Test Preview</div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {cues[testIndex].type === "VIDEO" ? (
                <video
                  key={cues[testIndex].id + testIndex}
                  src={cues[testIndex].file_url}
                  autoPlay
                  muted
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={cues[testIndex].file_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Cue {testIndex + 1}/{cues.length}: {cues[testIndex].type} — {cues[testIndex].title}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editDialog.cue && (
        <CueEditDialog
          key={editDialog.cue.id + editDialog.index}
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
          cue={editDialog.cue}
          onSave={handleCueEditSave}
          onMediaCreated={(newMedia) => setMedias((prev) => [...prev, newMedia])}
        />
      )}
    </div>
  );
}