import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveControls from "@/components/LiveControls";
import ActionLog from "@/components/ActionLog";

const MAX_LOGS = 10;

export default function LiveControl() {
  const [cues, setCues] = useState([]);
  const [safetyImageUrl, setSafetyImageUrl] = useState("");
  const [cueIndex, setCueIndex] = useState(0);
  const [status, setStatus] = useState("IDLE");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [projectorConnected, setProjectorConnected] = useState(false);
  const channelRef = useRef(null);
  const projectorWindow = useRef(null);

  const addLog = useCallback((entry) => {
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  // Load show data with real-time updates
  useEffect(() => {
    let unsubscribe;
    
    (async () => {
      try {
        const shows = await base44.entities.Show.list("-updated_date", 1);
        if (shows.length > 0) {
          setCues(shows[0].cues || []);
          setSafetyImageUrl(shows[0].safety_image_url || "");
          
          // Subscribe to show updates
          unsubscribe = base44.entities.Show.subscribe((event) => {
            if (event.type === "update" && event.id === shows[0].id) {
              setCues(event.data.cues || []);
              setSafetyImageUrl(event.data.safety_image_url || "");
              addLog({ message: "Show updated from Setup", level: "info", time: new Date().toLocaleTimeString() });
              
              // Send updated data to projector
              if (channelRef.current) {
                channelRef.current.postMessage({
                  action: "INIT",
                  payload: { cues: event.data.cues || [], safetyImageUrl: event.data.safety_image_url || "" }
                });
              }
            }
          });
        }
      } catch (error) {
        console.error("Error loading show data:", error);
      }
      setLoading(false);
    })();
    
    return () => unsubscribe?.();
  }, [addLog]);

  // BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel("concert-cue-control");
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { action, payload } = event.data;
      if (action === "STATUS_UPDATE") {
        setStatus(payload.status);
        setCueIndex(payload.cueIndex);
        setProjectorConnected(true);
      }
    };

    // Check if projector window is open
    const interval = setInterval(() => {
      if (projectorWindow.current && projectorWindow.current.closed) {
        setProjectorConnected(false);
        addLog({ message: "Projector window closed", level: "warn", time: new Date().toLocaleTimeString() });
        projectorWindow.current = null;
      }
    }, 1000);

    return () => {
      channel.close();
      clearInterval(interval);
    };
  }, [addLog]);

  const openProjector = () => {
    const url = createPageUrl("LiveProjector");
    projectorWindow.current = window.open(url, "projector", "width=1920,height=1080");
    if (projectorWindow.current) {
      setProjectorConnected(true);
      addLog({ message: "Projector window opened", level: "info", time: new Date().toLocaleTimeString() });
      
      // Send fresh show data to projector after window loads
      setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.postMessage({
            action: "INIT",
            payload: { cues, safetyImageUrl }
          });
          addLog({ message: "Show data sent to projector", level: "info", time: new Date().toLocaleTimeString() });
        }
      }, 1500);
    }
  };

  const sendCommand = useCallback((action, payload = {}) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ action, payload });
    }
  }, []);

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

  const handleSpace = useCallback(() => {
    if (!started) {
      setStarted(true);
      sendCommand("START");
      addLog({ message: "Show started", level: "info", time: new Date().toLocaleTimeString() });
      return;
    }

    sendCommand("SPACE", { cueIndex, status });
    
    const cue = cues[cueIndex];
    if (cue?.type === "VIDEO" && status === "PLAYING") {
      const nextIdx = cueIndex + 1;
      const nextCue = cues[nextIdx];
      if (nextCue) {
        addLog({ message: `Fade → ${nextCue.title}`, level: "info", time: new Date().toLocaleTimeString() });
      }
    } else if (cue?.type === "IMAGE") {
      const nextIdx = cueIndex + 1;
      const nextCue = cues[nextIdx];
      if (nextCue) {
        addLog({ message: `Go → ${nextCue.title}`, level: "info", time: new Date().toLocaleTimeString() });
      }
    }
  }, [started, cues, cueIndex, status, sendCommand, addLog]);

  const handleNext = useCallback(() => {
    if (cueIndex < cues.length - 1) {
      sendCommand("NEXT", { cueIndex });
      addLog({ message: `Skip → cue ${cueIndex + 2}`, level: "info", time: new Date().toLocaleTimeString() });
    }
  }, [cueIndex, cues.length, sendCommand, addLog]);

  const handlePrev = useCallback(() => {
    if (cueIndex > 0) {
      sendCommand("PREV", { cueIndex });
      addLog({ message: `Back → cue ${cueIndex}`, level: "info", time: new Date().toLocaleTimeString() });
    }
  }, [cueIndex, sendCommand, addLog]);

  const handleReload = useCallback(() => {
    sendCommand("RELOAD", {});
    // Remettre l'état local au début
    setCueIndex(0);
    setStarted(false);
    setStatus("IDLE");
    addLog({ message: "↩ Reset → cue 1 (début)", level: "info", time: new Date().toLocaleTimeString() });
  }, [sendCommand, addLog]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          handleSpace();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (cues.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-400">
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Live Control</h1>
            <p className="text-sm text-zinc-500 mt-1">Contrôlez le show depuis votre laptop</p>
          </div>
          <div className="flex items-center gap-3">
            {!projectorConnected ? (
              <Button onClick={openProjector} className="bg-blue-600 hover:bg-blue-500 gap-2">
                <ExternalLink className="w-4 h-4" />
                Ouvrir Projecteur
              </Button>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Projecteur connecté
              </div>
            )}
            <Link to={createPageUrl("Setup")}>
              <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Setup
              </Button>
            </Link>
          </div>
        </div>

        {/* Warning if not connected */}
        {!projectorConnected && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 text-sm font-medium">
              ⚠️ Ouvrez la fenêtre projecteur et déplacez-la sur l'écran externe avant de commencer
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
          <LiveControls
            currentCue={cues[cueIndex]}
            nextCue={cues[cueIndex + 1]}
            status={status}
            spaceActionLabel={getSpaceActionLabel()}
            onSpace={handleSpace}
            onNext={handleNext}
            onPrev={handlePrev}
            onReload={handleReload}
            cueIndex={cueIndex}
            totalCues={cues.length}
          />
        </div>

        {/* Timeline preview */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Timeline</div>
          <div className="space-y-2">
            {cues.map((cue, idx) => (
              <div
                key={cue.id}
                className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                  idx === cueIndex
                    ? "bg-white/10 border-white/30 shadow-lg"
                    : idx < cueIndex
                    ? "bg-zinc-800/30 border-zinc-700/30 opacity-50"
                    : "bg-zinc-900/50 border-zinc-800"
                }`}
              >
                <div className="text-sm font-bold text-zinc-500 w-8">{idx + 1}</div>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  cue.type === "VIDEO" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {cue.type}
                </span>
                <div className="text-sm font-medium text-zinc-300 flex-1">{cue.title}</div>
                {idx === cueIndex && (
                  <div className="text-xs px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                    NOW
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action log */}
        <ActionLog logs={logs} />
      </div>
    </div>
  );
}