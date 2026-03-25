import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import LivePlayer from "@/components/LivePlayer";

// Standalone projector page - no auth required
export default function LiveProjector() {
  const [cues, setCues] = useState([]);
  const [safetyImageUrl, setSafetyImageUrl] = useState("");
  const [cueIndex, setCueIndex] = useState(0);
  const [status, setStatus] = useState("IDLE");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const playerRef = useRef(null);
  const channelRef = useRef(null);
  const preloadRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const autoplayNextRef = useRef(false);
  const currentCueIndexRef = useRef(0);
  // Refs to always have fresh data in BroadcastChannel handler
  const cuesRef = useRef([]);
  const safetyImageUrlRef = useRef("");

  // Keep refs in sync with state
  useEffect(() => { cuesRef.current = cues; }, [cues]);
  useEffect(() => { safetyImageUrlRef.current = safetyImageUrl; }, [safetyImageUrl]);

  // Preload next cue
  const preloadNext = useCallback((idx) => {
    if (preloadRef.current) {
      const old = document.querySelector('link[data-cue-preload]');
      if (old) old.remove();
      preloadRef.current = null;
    }

    const next = cuesRef.current[idx];
    if (!next || !next.file_url) return;

    // idb:// URLs are already local — no HTTP prefetch needed
    if (next.file_url.startsWith('idb://')) return;
    // blob: URLs from another window are invalid — skip
    if (next.file_url.startsWith('blob:')) return;

    if (next.type === "VIDEO") {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = next.file_url;
      link.dataset.cuePreload = "true";
      document.head.appendChild(link);
      preloadRef.current = link;
    } else {
      const img = new window.Image();
      img.src = next.file_url;
      preloadRef.current = img;
    }
  }, []);

  useEffect(() => {
    if (cues.length > 0) {
      preloadNext(cueIndex + 1);
    }
  }, [cueIndex, cues, preloadNext]);

  const showSafety = useCallback(() => {
    if (safetyImageUrlRef.current) {
      playerRef.current?.showSafetyImage(safetyImageUrlRef.current);
    }
    setStatus("INTERLUDE");
  }, []);

  const executeCue = useCallback(async (index) => {
    // Prevent concurrent transitions
    if (isTransitioningRef.current) {
      console.log("⏸ Transition already in progress, ignoring command");
      return;
    }

    const cue = cuesRef.current[index];
    if (!cue) return;

    isTransitioningRef.current = true;
    setCueIndex(index);
    currentCueIndexRef.current = index;

    try {
      if (cue.type === "IMAGE") {
        if (cue.file_url) {
          await playerRef.current?.showImage(cue.file_url, cue.fadeInMs || 800);
          setStatus("INTERLUDE");
        } else {
          showSafety();
        }
      } else if (cue.type === "VIDEO") {
        if (cue.file_url) {
          setStatus("LOADING");
          // Configurer l'autoplay pour le callback onVideoEnded
          autoplayNextRef.current = cue.autoplayNext && !cue.loop;
          const success = await playerRef.current?.playVideo(cue.file_url, cue.fadeInMs || 1200, cue.loop || false);
          if (!success) {
            showSafety();
            autoplayNextRef.current = false;
          }
        } else {
          showSafety();
        }
      }
    } finally {
      isTransitioningRef.current = false;
    }
  }, [showSafety]);

  useEffect(() => {
    if (status === "ERROR" && safetyImageUrl) {
      playerRef.current?.showSafetyImage(safetyImageUrl);
    }
  }, [status, safetyImageUrl]);

  // BroadcastChannel communication
  useEffect(() => {
    const channel = new BroadcastChannel("concert-cue-control");
    channelRef.current = channel;
    
    // Signal that projector is ready
    setReady(true);

    channel.onmessage = async (event) => {
      const { action, payload } = event.data;
      const currentCues = cuesRef.current;

      switch (action) {
        case "INIT":
          // Clear player state completely before loading new data
          playerRef.current?.releaseVideo();
          setCues(payload.cues || []);
          setSafetyImageUrl(payload.safetyImageUrl || "");
          setCueIndex(0);
          setStatus("IDLE");
          setStarted(false);
          console.log("Projector reinitialized with", payload.cues?.length, "cues");
          break;

        case "START":
          if (currentCues.length > 0) {
            setStarted(true);
            await executeCue(0);
          }
          break;

        case "SPACE": {
          const cue = currentCues[payload.cueIndex];
          if (!cue) break;

          if (cue.type === "VIDEO") {
            if (payload.status === "PLAYING") {
              const nextIdx = payload.cueIndex + 1;
              if (nextIdx < currentCues.length) {
                await executeCue(nextIdx);
              } else {
                showSafety();
              }
            } else {
              if (cue.file_url) {
                const success = await playerRef.current?.playVideo(cue.file_url, cue.fadeInMs || 1200, cue.loop || false);
                if (!success) showSafety();
              }
            }
          } else if (cue.type === "IMAGE") {
            const nextIdx = payload.cueIndex + 1;
            if (nextIdx < currentCues.length) {
              await executeCue(nextIdx);
            }
          }
          break;
        }

        case "NEXT":
          await executeCue(payload.cueIndex + 1);
          break;

        case "PREV":
          await executeCue(payload.cueIndex - 1);
          break;

        case "RELOAD":
          // Remettre au début : stop tout, overlay affiché, cue 0 prêt
          playerRef.current?.releaseVideo();
          setCueIndex(0);
          setStatus("IDLE");
          setStarted(false);
          isTransitioningRef.current = false;
          break;
      }
    };

    return () => channel.close();
  }, [executeCue, showSafety]);

  // Send status updates back to control
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        action: "STATUS_UPDATE",
        payload: { status, cueIndex }
      });
    }
  }, [status, cueIndex]);

  // Callback quand une vidéo se termine
  const handleVideoEnded = useCallback(() => {
    if (autoplayNextRef.current) {
      const nextIdx = currentCueIndexRef.current + 1;
      if (nextIdx < cuesRef.current.length) {
        executeCue(nextIdx);
      } else {
        showSafety();
      }
      autoplayNextRef.current = false;
    }
  }, [executeCue, showSafety]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Player full screen */}
      <div className="flex-1 relative">
        <LivePlayer
          ref={playerRef}
          onStatusChange={setStatus}
          onLog={() => {}}
          onVideoEnded={handleVideoEnded}
        />

        {!started && ready && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-6xl font-bold text-white mb-6 tracking-tight">PROJECTEUR</h2>
              <p className="text-zinc-400 text-2xl">
                {cues.length === 0 ? "En attente des données..." : "Prêt - En attente du START"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}