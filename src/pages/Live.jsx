import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivePlayer from "@/components/LivePlayer";
import LiveControls from "@/components/LiveControls";
import ActionLog from "@/components/ActionLog";

const MAX_LOGS = 5;

export default function Live() {
  const [cues, setCues] = useState([]);
  const [safetyImageUrl, setSafetyImageUrl] = useState("");
  const [cueIndex, setCueIndex] = useState(0);
  const [status, setStatus] = useState("IDLE");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const preloadRef = useRef(null);

  const addLog = useCallback((entry) => {
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  // Load show data
  useEffect(() => {
    (async () => {
      const shows = await base44.entities.Show.list("-updated_date", 1);
      if (shows.length > 0) {
        setCues(shows[0].cues || []);
        setSafetyImageUrl(shows[0].safety_image_url || "");
      }
      setLoading(false);
    })();
  }, []);

  // Preload next cue
  const preloadNext = useCallback((idx) => {
    // Clean previous preload
    if (preloadRef.current) {
      const old = document.querySelector('link[data-cue-preload]');
      if (old) old.remove();
      preloadRef.current = null;
    }

    const next = cues[idx];
    if (!next || !next.file_url) return;

    if (next.type === "VIDEO") {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = next.file_url;
      link.dataset.cuePreload = "true";
      document.head.appendChild(link);
      preloadRef.current = link;
    } else {
      const img = new window.Image();
      img.src = next.file_url;
      preloadRef.current = img;
    }
  }, [cues]);

  // Preload whenever cueIndex changes
  useEffect(() => {
    if (cues.length > 0) {
      preloadNext(cueIndex + 1);
    }
  }, [cueIndex, cues, preloadNext]);

  const showSafety = useCallback(() => {
    if (safetyImageUrl) {
      playerRef.current?.showSafetyImage(safetyImageUrl);
    }
    setStatus("INTERLUDE");
  }, [safetyImageUrl]);

  const executeCue = useCallback(async (index) => {
    const cue = cues[index];
    if (!cue) return;

    setCueIndex(index);

    if (cue.type === "IMAGE") {
      if (cue.file_url) {
        playerRef.current?.showImage(cue.file_url, cue.fadeInMs || 800);
        setStatus("INTERLUDE");
      } else {
        showSafety();
      }
    } else if (cue.type === "VIDEO") {
      if (cue.file_url) {
        setStatus("LOADING");
        const success = await playerRef.current?.playVideo(cue.file_url, cue.fadeOutMs || 1200);
        if (!success) {
          showSafety();
        }
      } else {
        showSafety();
        addLog({ message: "No file for video cue", level: "error", time: new Date().toLocaleTimeString() });
      }
    }
  }, [cues, showSafety, addLog]);

  // Handle error status - timeout safety
  useEffect(() => {
    if (status === "ERROR" && safetyImageUrl) {
      playerRef.current?.showSafetyImage(safetyImageUrl);
    }
  }, [status, safetyImageUrl]);

  const getSpaceActionLabel = useCallback(() => {
    if (!started) return "START SHOW";
    const cue = cues[cueIndex];
    if (!cue) return "—";

    if (cue.type === "VIDEO") {
      if (status === "PLAYING") {
        const nextCue = cues[cueIndex + 1];
        return nextCue ? `FADE → ${nextCue.title}` : "FADE → Safety Image";
      }
      if (status === "LOADING" || status === "ERROR") {
        return "RETRY PLAY";
      }
      return "PLAY VIDEO";
    }

    if (cue.type === "IMAGE") {
      const nextCue = cues[cueIndex + 1];
      if (nextCue) {
        return nextCue.type === "VIDEO" ? `LAUNCH → ${nextCue.title}` : `SHOW → ${nextCue.title}`;
      }
      return "END OF SHOW";
    }
    return "—";
  }, [cues, cueIndex, status, started]);

  const handleSpace = useCallback(async () => {
    if (!started) {
      setStarted(true);
      addLog({ message: "Show started", level: "info", time: new Date().toLocaleTimeString() });
      await executeCue(0);
      return;
    }

    const cue = cues[cueIndex];
    if (!cue) return;

    if (cue.type === "VIDEO") {
      if (status === "PLAYING") {
        // Fade out video -> show next image or safety
        const nextIdx = cueIndex + 1;
        const nextCue = cues[nextIdx];

        if (nextCue && nextCue.type === "IMAGE" && nextCue.file_url) {
          playerRef.current?.showImage(nextCue.file_url, cue.fadeOutMs || 1200);
          setCueIndex(nextIdx);
          setStatus("INTERLUDE");
          addLog({ message: `Fade → ${nextCue.title}`, level: "info", time: new Date().toLocaleTimeString() });
        } else {
          showSafety();
          // Still advance if next exists
          if (nextCue) {
            setCueIndex(nextIdx);
          }
          addLog({ message: "Fade → Safety image", level: "warn", time: new Date().toLocaleTimeString() });
        }
        // Release old video after fade
        setTimeout(() => {
          playerRef.current?.releaseVideo();
        }, (cue.fadeOutMs || 1200) + 200);
      } else if (status === "LOADING" || status === "ERROR" || status === "LOADED") {
        // Retry
        if (cue.file_url) {
          const success = await playerRef.current?.playVideo(cue.file_url, cue.fadeOutMs || 1200);
          if (!success) showSafety();
        }
      }
    } else if (cue.type === "IMAGE") {
      // Advance to next cue
      const nextIdx = cueIndex + 1;
      const nextCue = cues[nextIdx];
      if (nextCue) {
        await executeCue(nextIdx);
        addLog({ message: `Go → ${nextCue.title}`, level: "info", time: new Date().toLocaleTimeString() });
      }
    }
  }, [started, cues, cueIndex, status, executeCue, showSafety, addLog]);

  const handleNext = useCallback(async () => {
    if (cueIndex < cues.length - 1) {
      playerRef.current?.releaseVideo();
      await executeCue(cueIndex + 1);
      addLog({ message: `Skip → cue ${cueIndex + 2}`, level: "info", time: new Date().toLocaleTimeString() });
    }
  }, [cueIndex, cues.length, executeCue, addLog]);

  const handlePrev = useCallback(async () => {
    if (cueIndex > 0) {
      playerRef.current?.releaseVideo();
      await executeCue(cueIndex - 1);
      addLog({ message: `Back → cue ${cueIndex}`, level: "info", time: new Date().toLocaleTimeString() });
    }
  }, [cueIndex, executeCue, addLog]);

  const handleReload = useCallback(async () => {
    playerRef.current?.releaseVideo();
    await executeCue(cueIndex);
    addLog({ message: `Reload cue ${cueIndex + 1}`, level: "info", time: new Date().toLocaleTimeString() });
  }, [cueIndex, executeCue, addLog]);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      // Ignore if user is in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          handleSpace();
          break;
        case "KeyN":
          e.preventDefault();
          handleNext();
          break;
        case "KeyP":
          e.preventDefault();
          handlePrev();
          break;
        case "KeyR":
          e.preventDefault();
          handleReload();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSpace, handleNext, handlePrev, handleReload]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (cues.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-zinc-400">
        <p className="text-xl">No cues configured</p>
        <Link to={createPageUrl("Setup")}>
          <Button variant="outline" className="bg-zinc-800 border-zinc-600 text-zinc-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Setup
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Back link (small) */}
      <div className="absolute top-2 left-2 z-50">
        <Link to={createPageUrl("Setup")}>
          <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-300 text-xs gap-1">
            <ArrowLeft className="w-3 h-3" />
            Setup
          </Button>
        </Link>
      </div>

      {/* Player area */}
      <div className="flex-1 relative">
        <LivePlayer
          ref={playerRef}
          onStatusChange={setStatus}
          onLog={addLog}
        />

        {/* Not started overlay */}
        {!started && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Ready</h2>
              <p className="text-zinc-400 text-lg mb-8">{cues.length} cues loaded</p>
              <Button
                onClick={handleSpace}
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 h-16 px-12 text-xl font-bold"
              >
                Press SPACE to Start
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <LiveControls
        currentCue={cues[cueIndex]}
        nextCue={cues[cueIndex + 1]}
        status={status}
        spaceActionLabel={getSpaceActionLabel()}
        onSpace={handleSpace}
        onNext={handleNext}
        onPrev={handlePrev}
        onReload={handleReload}
        onFullscreen={handleFullscreen}
        cueIndex={cueIndex}
        totalCues={cues.length}
      />

      {/* Action log */}
      <div className="px-4 pb-3">
        <ActionLog logs={logs} />
      </div>
    </div>
  );
}