import React from "react";

const STATUS_STYLES = {
  LOADED: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  PLAYING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  INTERLUDE: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  ERROR: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
  LOADING: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  IDLE: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

export default function StatusDisplay({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.IDLE;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-lg font-bold tracking-wider uppercase ${style}`}>
      <div className={`w-3 h-3 rounded-full ${
        status === "PLAYING" ? "bg-emerald-400 animate-pulse" :
        status === "ERROR" ? "bg-red-400" :
        status === "LOADING" ? "bg-amber-400 animate-pulse" :
        status === "INTERLUDE" ? "bg-purple-400" :
        status === "LOADED" ? "bg-blue-400" :
        "bg-zinc-400"
      }`} />
      {status}
    </div>
  );
}