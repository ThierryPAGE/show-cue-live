import React from "react";
import { Play, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusDisplay from "@/components/StatusDisplay";

export default function LiveControls({
  currentCue,
  nextCue,
  status,
  spaceActionLabel,
  onSpace,
  onNext,
  onPrev,
  onReload,
  cueIndex,
  totalCues,
}) {
  return (
    <div className="bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-700/50 p-4 md:p-6">
      {/* Status + Cue Info */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
        <StatusDisplay status={status} />

        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
              NOW — {cueIndex + 1}/{totalCues}
            </div>
            {currentCue ? (
              <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
                <span className={`text-sm font-bold mr-2 px-2 py-0.5 rounded ${
                  currentCue.type === "VIDEO" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {currentCue.type}
                </span>
                {currentCue.title}
              </div>
            ) : (
              <div className="text-xl text-zinc-500">—</div>
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">NEXT</div>
            {nextCue ? (
              <div className="text-lg md:text-xl font-semibold text-zinc-400">
                <span className={`text-xs font-bold mr-2 px-1.5 py-0.5 rounded ${
                  nextCue.type === "VIDEO" ? "bg-blue-500/15 text-blue-400/70" : "bg-emerald-500/15 text-emerald-400/70"
                }`}>
                  {nextCue.type}
                </span>
                {nextCue.title}
              </div>
            ) : (
              <div className="text-lg text-zinc-600">End of show</div>
            )}
          </div>
        </div>
      </div>

      {/* Space action label */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-600/50">
          <kbd className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs font-mono font-bold">SPACE</kbd>
          <span className="text-sm font-medium text-zinc-300">{spaceActionLabel}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button
          onClick={onPrev}
          variant="outline"
          size="lg"
          className="bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white h-14 px-6 text-base"
        >
          <SkipBack className="w-5 h-5 mr-2" />
          Prev (←)
        </Button>

        <Button
          onClick={onSpace}
          size="lg"
          className="bg-white text-black hover:bg-zinc-200 h-16 px-10 text-lg font-bold shadow-lg shadow-white/10"
        >
          <Play className="w-6 h-6 mr-2" />
          {spaceActionLabel}
        </Button>

        <Button
          onClick={onNext}
          variant="outline"
          size="lg"
          className="bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white h-14 px-6 text-base"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Next (→)
        </Button>

        <Button
          onClick={onReload}
          variant="outline"
          size="lg"
          className="bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white h-14 px-6 text-base"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Reload (R)
        </Button>
      </div>
    </div>
  );
}